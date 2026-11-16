#!/usr/bin/env node
/**
 * Moves the old flat note board into notebooks.
 *
 * For every learner, one notebook per subject that actually has notes
 * ("Mathematics notes", "Science notes", ...), and each old note becomes a
 * source of kind `text` inside it, left `queued` so the ingestion worker
 * chunks and embeds it.
 *
 * The old `notes` collection is not touched, and neither is the old `sources`
 * collection. Nothing is deleted by this script, ever.
 *
 * Idempotent: every document it writes has a derived `_id`, so a second run
 * updates the same documents instead of making duplicates. Safe to re-run
 * after adding more notes.
 *
 * Usage:
 *   node scripts/migrate-notes-to-notebooks.mjs --dry-run
 *   node scripts/migrate-notes-to-notebooks.mjs
 *   node scripts/migrate-notes-to-notebooks.mjs --user user_123
 *   node scripts/migrate-notes-to-notebooks.mjs --no-sources   (skip old sources)
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Reads a dotenv file without overriding anything already in the environment. */
function loadEnvFile(name) {
  const file = join(root, name);
  if (!existsSync(file)) return;
  try {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const key = match[1];
      if (process.env[key] !== undefined) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch (error) {
    console.warn(`Could not read ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || args.includes('-n');
const INCLUDE_SOURCES = !args.includes('--no-sources');
const ONLY_USER = (() => {
  const index = args.indexOf('--user');
  return index !== -1 ? args[index + 1] : null;
})();

/** An emoji per subject, so the notebook cards are not a wall of grey. */
const SUBJECT_EMOJI = {
  Mathematics: '🔢',
  Science: '🔬',
  English: '📖',
  'Social Studies': '🌍',
  Agriculture: '🌱',
  'Life Skills': '💡',
};

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'general';
}

/** Derived ids make the whole migration idempotent. */
function notebookId(userId, subject) {
  return `nb_${slug(userId)}_${slug(subject)}`;
}

function sourceId(kind, originalId) {
  return `src_${kind}_${slug(originalId)}`;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

async function main() {
  const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Add it to .env.local or .env.');
    process.exit(1);
  }

  const client = new MongoClient(uri, { appName: 'sautika-migrate' });
  await client.connect();

  try {
    const db = client.db('sautika');
    const oldNotes = db.collection('notes');
    const oldSources = db.collection('sources');
    const notebooks = db.collection('notebooks');
    const newSources = db.collection('notebook_sources');

    const userFilter = ONLY_USER ? { userId: ONLY_USER } : {};

    console.log(DRY_RUN ? '── Dry run: nothing will be written ──' : '── Migrating ──');
    if (ONLY_USER) console.log(`Limited to user ${ONLY_USER}`);

    const notes = await oldNotes.find(userFilter).sort({ userId: 1, createdAt: 1 }).toArray();
    const sources = INCLUDE_SOURCES
      ? await oldSources.find(userFilter).sort({ userId: 1, createdAt: 1 }).toArray()
      : [];

    console.log(`Found ${plural(notes.length, 'note')} and ${plural(sources.length, 'old source')}.`);

    if (notes.length === 0 && sources.length === 0) {
      console.log('Nothing to migrate.');
      return;
    }

    // Group everything by (user, subject). Old sources have no subject, so they
    // go into one "Imported sources" notebook per learner.
    const groups = new Map();
    const push = (userId, subject, item) => {
      const key = `${userId}\u0000${subject}`;
      if (!groups.has(key)) groups.set(key, { userId, subject, items: [] });
      groups.get(key).items.push(item);
    };

    for (const note of notes) {
      if (!note.userId) continue;
      const subject = typeof note.subject === 'string' && note.subject.trim() ? note.subject.trim() : 'Science';
      push(note.userId, subject, {
        kind: 'text',
        originalId: note._id,
        title: note.title ?? 'Untitled note',
        text: typeof note.text === 'string' ? note.text : '',
        createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(),
      });
    }

    for (const source of sources) {
      if (!source.userId) continue;
      push(source.userId, 'Imported sources', {
        kind: 'text',
        originalId: source._id,
        title: source.name ?? 'Imported source',
        text: typeof source.text === 'string' ? source.text : '',
        createdAt: source.createdAt instanceof Date ? source.createdAt : new Date(),
      });
    }

    const now = new Date();
    let notebooksWritten = 0;
    let sourcesWritten = 0;
    let emptySkipped = 0;

    for (const { userId, subject, items } of groups.values()) {
      const _id = notebookId(userId, subject);
      const title = subject === 'Imported sources' ? 'Imported sources' : `${subject} notes`;

      const usable = items.filter((item) => item.text.trim().length > 0);
      emptySkipped += items.length - usable.length;
      if (usable.length === 0) continue;

      console.log(
        `${DRY_RUN ? '[dry]' : '     '} ${title} (${userId}) -> ${plural(usable.length, 'source')}`,
      );

      if (!DRY_RUN) {
        await notebooks.updateOne(
          { _id },
          {
            // sourceCount is set after the sources are written, below.
            $set: {
              userId,
              title,
              emoji: SUBJECT_EMOJI[subject] ?? '📚',
              language: 'eng',
              ...(subject === 'Imported sources' ? {} : { subject }),
              isFeatured: false,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now, sourceCount: 0 },
          },
          { upsert: true },
        );
      }
      notebooksWritten += 1;

      for (const item of usable) {
        const id = sourceId(item.kind, item.originalId);
        if (!DRY_RUN) {
          await newSources.updateOne(
            { _id: id },
            {
              $set: {
                notebookId: _id,
                userId,
                kind: item.kind,
                title: String(item.title).slice(0, 300) || 'Untitled',
                language: 'eng',
                charCount: item.text.length,
                updatedAt: now,
              },
              // Only a new source is queued: a re-run must not re-chunk
              // something that is already ready.
              $setOnInsert: { status: 'queued', createdAt: item.createdAt },
            },
            { upsert: true },
          );

          // The chunker reads the text from here on first ingest. It is kept
          // outside the validator's required fields on purpose: once chunked,
          // the text lives in source_chunks.
          await newSources.updateOne({ _id: id }, { $set: { rawText: item.text } });
        }
        sourcesWritten += 1;
      }

      if (!DRY_RUN) {
        const count = await newSources.countDocuments({ notebookId: _id });
        await notebooks.updateOne({ _id }, { $set: { sourceCount: count } });
      }
    }

    console.log('');
    console.log(`${DRY_RUN ? 'Would write' : 'Wrote'} ${plural(notebooksWritten, 'notebook')} and ${plural(sourcesWritten, 'source')}.`);
    if (emptySkipped > 0) console.log(`Skipped ${plural(emptySkipped, 'empty note')}.`);
    if (!DRY_RUN) {
      const queued = await newSources.countDocuments({ status: 'queued' });
      console.log(`${plural(queued, 'source')} queued for chunking.`);
      console.log('Process them with the app running:');
      console.log('  curl -X POST -H "Authorization: Bearer $CRON_SECRET" \\');
      console.log('       "http://localhost:3000/api/sources/process?limit=5"');
      console.log('Repeat until it reports 0 processed. With Inngest configured, its');
      console.log('source-ingest function picks them up on its own.');
    }
    console.log('The old notes and sources collections were not changed.');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

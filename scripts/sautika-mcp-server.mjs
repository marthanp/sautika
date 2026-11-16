#!/usr/bin/env node
/**
 * Sautika MCP server — stdio transport.
 *
 *   npm run mcp
 *   npm run mcp:inspect
 *
 * All the protocol work lives in src/mcp/core.ts, which this file imports
 * directly: Node 22.18+ strips the types natively, so there is no build step
 * and the HTTP transport (src/app/api/mcp/route.ts) runs exactly the same code.
 *
 * Everything written to stdout is a JSON-RPC message. Logs go to stderr.
 */

import { createInterface } from 'node:readline';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const MAX_DOCUMENT_CHARS = 200_000;
const DEFAULT_DOCUMENT_CHARS = 20_000;
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.csv', '.json', '.text']);
const IMAGE_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
};

function log(message) {
  process.stderr.write(`[sautika-mcp] ${message}\n`);
}

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
    log(`could not read ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

function moduleUrl(relative) {
  return pathToFileURL(join(root, relative)).href;
}

let COURSES;
let SUNBIRD_LANGUAGES;
let hasSunbirdTts;
let searchCourses;
let handleMcpMessage;

try {
  const [coursesModule, languagesModule, searchModule, coreModule] = await Promise.all([
    import(moduleUrl('src/data/courses.ts')),
    import(moduleUrl('src/lib/sunbird-languages.ts')),
    import(moduleUrl('src/lib/course-search.ts')),
    import(moduleUrl('src/mcp/core.ts')),
  ]);
  COURSES = coursesModule.COURSES;
  SUNBIRD_LANGUAGES = languagesModule.SUNBIRD_LANGUAGES;
  hasSunbirdTts = languagesModule.hasSunbirdTts;
  searchCourses = searchModule.searchCourses;
  handleMcpMessage = coreModule.handleMcpMessage;
} catch (error) {
  process.stderr.write(
    'The Sautika MCP server needs Node.js 22.18 or newer, which runs TypeScript directly.\n' +
      `Current version: ${process.version}\n` +
      `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exit(1);
}

const ttsLanguages = new Set(
  SUNBIRD_LANGUAGES.filter((language) => hasSunbirdTts(language.code)).map((language) => language.code),
);

/* ------------------------------------------- local-only document extraction */

async function extractPdf(buffer) {
  const pdfParse = await import('pdf-parse');
  if (typeof pdfParse.PDFParse === 'function') {
    const parser = new pdfParse.PDFParse({ data: buffer });
    const result = await parser.getText();
    return typeof result?.text === 'string' ? result.text : '';
  }
  if (typeof pdfParse.default === 'function') {
    const result = await pdfParse.default(buffer);
    return typeof result?.text === 'string' ? result.text : '';
  }
  throw new Error('pdf-parse exposed neither PDFParse nor a default function.');
}

async function extractDocx(buffer) {
  const mammoth = await import('mammoth');
  const run = mammoth.extractRawText ?? mammoth.default?.extractRawText;
  if (typeof run !== 'function') throw new Error('mammoth.extractRawText is unavailable.');
  const result = await run({ buffer });
  return typeof result?.value === 'string' ? result.value : '';
}

const extractDocumentText = {
  definition: {
    name: 'extract_document_text',
    title: 'Read a local document',
    description:
      'Read text out of a file on this machine: .txt, .md, .csv, .json, .docx or .pdf. Local transport only.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file, relative to the project or absolute.' },
        max_chars: { type: 'integer', minimum: 100, maximum: MAX_DOCUMENT_CHARS },
      },
      required: ['path'],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async handler(args) {
    const raw = typeof args.path === 'string' ? args.path.trim() : '';
    if (!raw) return toolError('path is required.');

    const file = resolve(root, raw);
    let info;
    try {
      info = await stat(file);
    } catch {
      return toolError(`No file at ${raw}`);
    }
    if (!info.isFile()) return toolError(`${raw} is not a file.`);

    const limit = Math.min(
      MAX_DOCUMENT_CHARS,
      Math.max(100, typeof args.max_chars === 'number' ? Math.floor(args.max_chars) : DEFAULT_DOCUMENT_CHARS),
    );
    const extension = extname(file).toLowerCase();

    try {
      let text = '';
      if (TEXT_EXTENSIONS.has(extension)) {
        text = await readFile(file, 'utf8');
      } else if (extension === '.docx') {
        text = await extractDocx(await readFile(file));
      } else if (extension === '.pdf') {
        text = await extractPdf(await readFile(file));
      } else {
        return toolError(
          `Cannot read ${extension || 'that file type'}. Supported: .txt, .md, .csv, .json, .docx, .pdf.`,
        );
      }

      const trimmed = text.trim();
      if (!trimmed) return toolError(`${raw} has no readable text.`);
      const clipped = trimmed.slice(0, limit);
      return {
        content: [{ type: 'text', text: clipped }],
        structuredContent: {
          path: raw,
          characters: clipped.length,
          truncated: clipped.length < trimmed.length,
        },
      };
    } catch (error) {
      return toolError(`Could not read ${raw}: ${error instanceof Error ? error.message : error}`);
    }
  },
};

function toolError(message) {
  return { content: [{ type: 'text', text: message }], isError: true };
}

/* ------------------------------------------------------------------ context */

const context = {
  courses: COURSES,
  languages: SUNBIRD_LANGUAGES,
  ttsLanguages,
  searchCourses: (courses, query) => searchCourses(courses, query),
  env: process.env,
  fetch: (...args) => globalThis.fetch(...args),
  extraTools: [extractDocumentText],
  serverVersion: '2.0.0',
};

/** Over stdio an image may be a local path; the core only accepts URLs or data URIs. */
async function localImageToDataUri(message) {
  const params = message?.params;
  if (!params || params.name !== 'ocr_extract_text') return message;
  const args = params.arguments;
  if (!args || typeof args.image !== 'string') return message;

  const image = args.image.trim();
  if (/^https:\/\//i.test(image) || /^data:/i.test(image)) return message;

  const file = resolve(root, image);
  if (!existsSync(file)) return message;

  const mime = IMAGE_MIME[extname(file).toLowerCase()];
  if (!mime) return message;

  const buffer = await readFile(file);
  return {
    ...message,
    params: {
      ...params,
      arguments: { ...args, image: `data:${mime};base64,${buffer.toString('base64')}` },
    },
  };
}

/* ----------------------------------------------------------------- transport */

function send(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function handleOne(message) {
  try {
    const prepared = await localImageToDataUri(message);
    return await handleMcpMessage(context, prepared);
  } catch (error) {
    log(`handler failed: ${error instanceof Error ? error.stack ?? error.message : error}`);
    const id =
      message && (typeof message.id === 'string' || typeof message.id === 'number') ? message.id : null;
    if (id === null) return null;
    return { jsonrpc: '2.0', id, error: { code: -32603, message: 'Internal server error.' } };
  }
}

const inFlight = new Set();

function track(promise) {
  inFlight.add(promise);
  void promise.finally(() => inFlight.delete(promise));
}

function onLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: invalid JSON.' } });
    return;
  }

  track(
    (async () => {
      if (Array.isArray(parsed)) {
        const responses = (await Promise.all(parsed.map((entry) => handleOne(entry)))).filter(Boolean);
        if (responses.length) send(responses);
        return;
      }
      const response = await handleOne(parsed);
      if (response) send(response);
    })(),
  );
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', onLine);

rl.on('close', async () => {
  // Finish what is still running before the process goes away.
  while (inFlight.size > 0) {
    await Promise.allSettled([...inFlight]);
  }
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log(`uncaught: ${error instanceof Error ? error.stack ?? error.message : error}`);
});
process.on('unhandledRejection', (reason) => {
  log(`unhandled rejection: ${reason instanceof Error ? reason.stack ?? reason.message : reason}`);
});

log(`ready on stdio with ${COURSES.length} courses and ${SUNBIRD_LANGUAGES.length} languages`);

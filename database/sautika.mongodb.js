// Run with: mongosh "<MONGODB_URI>" --file database/sautika.mongodb.js
// The script is safe to rerun: it updates validators and recreates indexes.

var sautikaDb = db.getSiblingDB('sautika');
var educationLevels = [
  'Baby Class', 'Middle Class', 'Top Class',
  'P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7',
  'S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6',
];

var collections = {
  profiles: {
    required: ['_id', 'firstName', 'lastName', 'email', 'educationLevel', 'coins', 'xp', 'streak', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: 'string', description: 'Clerk user ID' },
      firstName: { bsonType: 'string', minLength: 1 },
      lastName: { bsonType: 'string', minLength: 1 },
      email: { bsonType: 'string', minLength: 3 },
      contact: { bsonType: 'string' },
      educationLevel: { enum: [...educationLevels, 'Not specified'] },
      coins: { bsonType: ['int', 'long'], minimum: 0 },
      xp: { bsonType: ['int', 'long'], minimum: 0 },
      streak: { bsonType: ['int', 'long'], minimum: 0 },
      lastActiveAt: { bsonType: 'date' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { email: 1 }, options: { unique: true, name: 'email_unique' } },
    ],
  },
  courses: {
    required: ['_id', 'slug', 'title', 'category', 'level', 'lessons', 'published', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      slug: { bsonType: 'string', minLength: 1 },
      title: { bsonType: 'string', minLength: 1 },
      category: { bsonType: 'string', minLength: 1 },
      level: { bsonType: 'string', minLength: 1 },
      language: { bsonType: 'string' },
      description: { bsonType: 'string' },
      emoji: { bsonType: 'string' },
      color: { bsonType: 'string' },
      published: { bsonType: 'bool' },
      lessons: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['title', 'items'],
          properties: {
            title: { bsonType: 'string', minLength: 1 },
            items: {
              bsonType: 'array',
              items: {
                bsonType: 'object',
                oneOf: [
                  {
                    required: ['k', 'q', 'a', 'd'],
                    properties: {
                      k: { enum: ['m'] },
                      q: { bsonType: 'string' },
                      a: { bsonType: 'string' },
                      d: {
                        bsonType: 'array',
                        minItems: 2,
                        maxItems: 2,
                        items: { bsonType: 'string' },
                      },
                    },
                  },
                  {
                    required: ['k', 'q', 'a', 'x'],
                    properties: {
                      k: { enum: ['b'] },
                      q: { bsonType: 'string' },
                      a: { bsonType: 'string' },
                      x: { bsonType: 'array', items: { bsonType: 'string' } },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { slug: 1 }, options: { unique: true, name: 'slug_unique' } },
      { key: { published: 1, category: 1, level: 1 }, options: { name: 'published_catalog' } },
    ],
  },
  course_progress: {
    required: ['userId', 'courseId', 'currentLessonIndex', 'completedLessonIndexes', 'xpEarned', 'enrolledAt', 'updatedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      courseId: { bsonType: ['string', 'objectId'] },
      currentLessonIndex: { bsonType: ['int', 'long'], minimum: 0 },
      completedLessonIndexes: { bsonType: 'array', items: { bsonType: ['int', 'long'], minimum: 0 } },
      xpEarned: { bsonType: ['int', 'long'], minimum: 0 },
      enrolledAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { userId: 1, courseId: 1 }, options: { unique: true, name: 'learner_course_unique' } },
      { key: { userId: 1, updatedAt: -1 }, options: { name: 'learner_progress_recent' } },
    ],
  },
  notes: {
    required: ['userId', 'subject', 'title', 'text', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      subject: { bsonType: 'string', minLength: 1 },
      title: { bsonType: 'string', minLength: 1, maxLength: 200 },
      text: { bsonType: 'string', maxLength: 50000 },
      courseId: { bsonType: ['string', 'objectId'] },
      lessonIndex: { bsonType: ['int', 'long'], minimum: 0 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { userId: 1, updatedAt: -1 }, options: { name: 'learner_notes_recent' } },
      { key: { userId: 1, subject: 1 }, options: { name: 'learner_notes_subject' } },
    ],
  },
  sources: {
    required: ['userId', 'name', 'text', 'enabled', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      name: { bsonType: 'string', minLength: 1, maxLength: 200 },
      text: { bsonType: 'string', maxLength: 1000000 },
      enabled: { bsonType: 'bool' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { userId: 1, updatedAt: -1 }, options: { name: 'learner_sources_recent' } },
    ],
  },
  user_settings: {
    required: ['userId', 'theme', 'colorMode', 'font', 'scale', 'wide', 'letterSpacing', 'lineHeight', 'readingTint', 'updatedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      theme: { enum: ['navy', 'parchment', 'contrast'] },
      colorMode: { enum: ['light', 'dark'] },
      font: { enum: ['default', 'opendyslexic', 'lexend', 'atkinson', 'comic-neue'] },
      scale: { enum: ['90%', '100%', '115%', '130%'] },
      wide: { bsonType: 'bool' },
      letterSpacing: { enum: ['normal', 'relaxed', 'wide'] },
      lineHeight: { enum: ['normal', 'relaxed', 'loose'] },
      readingTint: { enum: ['none', 'cream', 'yellow', 'peach', 'mint', 'blue'] },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { userId: 1 }, options: { unique: true, name: 'learner_settings_unique' } },
    ],
  },
  learning_sessions: {
    required: ['userId', 'courseId', 'lessonIndex', 'status', 'startedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      courseId: { bsonType: ['string', 'objectId'] },
      lessonIndex: { bsonType: ['int', 'long'], minimum: 0 },
      status: { enum: ['in_progress', 'completed', 'abandoned'] },
      score: { bsonType: ['int', 'long', 'double'], minimum: 0, maximum: 100 },
      durationSeconds: { bsonType: ['int', 'long'], minimum: 0 },
      startedAt: { bsonType: 'date' },
      completedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { userId: 1, startedAt: -1 }, options: { name: 'learner_sessions_recent' } },
      { key: { userId: 1, courseId: 1, lessonIndex: 1 }, options: { name: 'learner_sessions_lesson' } },
    ],
  },
  achievements: {
    required: ['_id', 'title', 'description', 'createdAt'],
    properties: {
      _id: { bsonType: 'string' },
      title: { bsonType: 'string', minLength: 1 },
      description: { bsonType: 'string' },
      icon: { bsonType: 'string' },
      criteria: { bsonType: 'object' },
      createdAt: { bsonType: 'date' },
    },
    indexes: [],
  },
  learner_achievements: {
    required: ['userId', 'achievementId', 'awardedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      achievementId: { bsonType: 'string', minLength: 1 },
      awardedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { userId: 1, achievementId: 1 }, options: { unique: true, name: 'learner_achievement_unique' } },
    ],
  },
  rewards: {
    required: ['_id', 'title', 'description', 'cost', 'active', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: 'string' },
      title: { bsonType: 'string', minLength: 1 },
      description: { bsonType: 'string' },
      cost: { bsonType: ['int', 'long'], minimum: 0 },
      active: { bsonType: 'bool' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { active: 1, cost: 1 }, options: { name: 'active_rewards_by_cost' } },
    ],
  },
  reward_redemptions: {
    required: ['userId', 'rewardId', 'cost', 'status', 'createdAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      rewardId: { bsonType: 'string', minLength: 1 },
      cost: { bsonType: ['int', 'long'], minimum: 0 },
      status: { enum: ['pending', 'fulfilled', 'cancelled'] },
      createdAt: { bsonType: 'date' },
      fulfilledAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { userId: 1, createdAt: -1 }, options: { name: 'learner_redemptions_recent' } },
    ],
  },
  coin_transactions: {
    required: ['userId', 'amount', 'type', 'reason', 'idempotencyKey', 'createdAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      amount: { bsonType: ['int', 'long'], minimum: 1 },
      type: { enum: ['earn', 'spend', 'adjustment'] },
      reason: { bsonType: 'string', minLength: 1 },
      referenceId: { bsonType: ['string', 'objectId'] },
      idempotencyKey: { bsonType: 'string', minLength: 1 },
      createdAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { userId: 1, createdAt: -1 }, options: { name: 'learner_transactions_recent' } },
      { key: { userId: 1, idempotencyKey: 1 }, options: { unique: true, name: 'transaction_idempotency_unique' } },
    ],
  },

  // ── Notebook workspace (Phase 2) ───────────────────────────────────────────
  // The source collection is `notebook_sources`, not `sources`: a `sources`
  // collection already exists for the old flat note board with a strict
  // validator requiring name/text/enabled, and reusing it would reject either
  // the old documents or the new ones.
  notebooks: {
    required: ['userId', 'title', 'language', 'isFeatured', 'sourceCount', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      title: { bsonType: 'string', minLength: 1, maxLength: 200 },
      emoji: { bsonType: 'string', maxLength: 8 },
      coverKey: { bsonType: 'string', maxLength: 500 },
      language: { bsonType: 'string', minLength: 2, maxLength: 10 },
      subject: { bsonType: 'string', maxLength: 100 },
      courseId: { bsonType: ['string', 'objectId'] },
      isFeatured: { bsonType: 'bool' },
      sourceCount: { bsonType: ['int', 'long'], minimum: 0 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { userId: 1, updatedAt: -1 }, options: { name: 'notebooks_recent' } },
      { key: { isFeatured: 1, subject: 1 }, options: { name: 'notebooks_featured' } },
      { key: { userId: 1, courseId: 1 }, options: { name: 'notebooks_by_course' } },
    ],
  },

  notebook_sources: {
    required: ['notebookId', 'userId', 'kind', 'title', 'status', 'language', 'charCount', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      notebookId: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      kind: { enum: ['pdf', 'docx', 'image', 'text', 'url', 'audio', 'course'] },
      title: { bsonType: 'string', minLength: 1, maxLength: 300 },
      r2Key: { bsonType: 'string', maxLength: 500 },
      url: { bsonType: 'string', maxLength: 2000 },
      status: { enum: ['queued', 'processing', 'ready', 'failed'] },
      error: { bsonType: 'string', maxLength: 500 },
      language: { bsonType: 'string', minLength: 2, maxLength: 10 },
      charCount: { bsonType: ['int', 'long'], minimum: 0 },
      // Pasted or migrated text, held only until the chunker has run; the
      // ingest step unsets it once the chunks exist.
      rawText: { bsonType: 'string', maxLength: 1000000 },
      guide: {
        bsonType: 'object',
        properties: {
          summary: { bsonType: 'string', maxLength: 2000 },
          keyTopics: { bsonType: 'array', items: { bsonType: 'string' } },
          suggestedQuestions: { bsonType: 'array', items: { bsonType: 'string' } },
        },
      },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { notebookId: 1, status: 1 }, options: { name: 'sources_by_status' } },
      { key: { userId: 1, createdAt: -1 }, options: { name: 'sources_recent' } },
    ],
  },

  // The Atlas Vector Search index on `embedding` is created separately; see
  // database/vector-index.json. The text index here is the keyword fallback.
  source_chunks: {
    required: ['sourceId', 'notebookId', 'userId', 'ord', 'text', 'charStart', 'charEnd'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      sourceId: { bsonType: ['string', 'objectId'] },
      notebookId: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      ord: { bsonType: ['int', 'long'], minimum: 0 },
      text: { bsonType: 'string', maxLength: 10000 },
      page: { bsonType: ['int', 'long'], minimum: 0 },
      charStart: { bsonType: ['int', 'long'], minimum: 0 },
      charEnd: { bsonType: ['int', 'long'], minimum: 0 },
      embedding: { bsonType: 'array', items: { bsonType: 'double' } },
    },
    indexes: [
      { key: { sourceId: 1, ord: 1 }, options: { name: 'chunks_in_order' } },
      { key: { userId: 1, notebookId: 1 }, options: { name: 'chunks_owner' } },
      { key: { text: 'text' }, options: { name: 'source_chunks_text', default_language: 'english' } },
    ],
  },

  chat_messages: {
    required: ['notebookId', 'userId', 'role', 'content', 'language', 'createdAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      notebookId: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      role: { enum: ['user', 'assistant'] },
      content: { bsonType: 'string', maxLength: 20000 },
      language: { bsonType: 'string', minLength: 2, maxLength: 10 },
      citations: { bsonType: 'array' },
      provider: { bsonType: 'string', maxLength: 100 },
      createdAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { notebookId: 1, createdAt: 1 }, options: { name: 'chat_in_order' } },
      { key: { userId: 1, createdAt: -1 }, options: { name: 'chat_recent' } },
    ],
  },

  notebook_notes: {
    required: ['notebookId', 'userId', 'title', 'body', 'origin', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      notebookId: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      title: { bsonType: 'string', minLength: 1, maxLength: 200 },
      body: { bsonType: 'string', maxLength: 50000 },
      origin: { enum: ['manual', 'saved_reply', 'studio'] },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { notebookId: 1, createdAt: 1 }, options: { name: 'notebook_notes_in_order' } },
      { key: { userId: 1, updatedAt: -1 }, options: { name: 'notebook_notes_recent' } },
    ],
  },

  studio_outputs: {
    required: ['notebookId', 'userId', 'type', 'status', 'language', 'createdAt', 'updatedAt'],
    properties: {
      _id: { bsonType: ['string', 'objectId'] },
      notebookId: { bsonType: ['string', 'objectId'] },
      userId: { bsonType: 'string', minLength: 1 },
      type: {
        enum: [
          'audio_overview', 'video_overview', 'mind_map', 'report', 'flashcards',
          'quiz', 'infographic', 'data_table', 'slide_deck',
        ],
      },
      status: { enum: ['queued', 'running', 'ready', 'failed'] },
      language: { bsonType: 'string', minLength: 2, maxLength: 10 },
      r2Key: { bsonType: 'string', maxLength: 500 },
      error: { bsonType: 'string', maxLength: 500 },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { notebookId: 1, createdAt: -1 }, options: { name: 'studio_recent' } },
      { key: { userId: 1, type: 1 }, options: { name: 'studio_by_type' } },
    ],
  },

  // Cluster-wide fixed-window rate limiting (src/lib/rate-limit.ts).
  // One document per key per window; the TTL index clears finished windows.
  rate_limits: {
    required: ['count', 'expiresAt'],
    properties: {
      _id: { bsonType: 'string' },
      count: { bsonType: ['int', 'long'], minimum: 0 },
      expiresAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'rate_limits_ttl' } },
    ],
  },

  // Shared second-level cache (src/lib/kv-cache.ts), used for translations and
  // the LLM circuit breaker. `value` is deliberately untyped: callers decide.
  kv_cache: {
    required: ['value', 'expiresAt'],
    properties: {
      _id: { bsonType: 'string' },
      expiresAt: { bsonType: 'date' },
    },
    indexes: [
      { key: { expiresAt: 1 }, options: { expireAfterSeconds: 0, name: 'kv_cache_ttl' } },
    ],
  },
};

Object.keys(collections).forEach(function (name) {
  var definition = collections[name];
  var validator = {
    $jsonSchema: {
      bsonType: 'object',
      required: definition.required,
      properties: definition.properties,
    },
  };
  var existing = sautikaDb.getCollectionInfos({ name: name }).length > 0;

  if (existing) {
    var result = sautikaDb.runCommand({
      collMod: name,
      validator: validator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
    if (!result.ok) {
      throw new Error('Could not update validator for ' + name + ': ' + tojson(result));
    }
  } else {
    sautikaDb.createCollection(name, {
      validator: validator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
  }

  definition.indexes.forEach(function (index) {
    sautikaDb.getCollection(name).createIndex(index.key, index.options);
  });
});

print('Sautika MongoDB schema is ready in database: ' + sautikaDb.getName());

/**
 * Sautika MCP server — Streamable HTTP transport (JSON responses).
 *
 * Shares every tool, resource and prompt with the stdio server through
 * src/mcp/core.ts. Anonymous callers get the read-only curriculum tools;
 * a bearer token unlocks the ones that spend Sunbird, LLM and OCR quota.
 */

import type { NextRequest } from 'next/server';
import { clientIp, rateLimit } from '@/lib/api-guard';
import { COURSES } from '@/data/courses';
import { searchCourses } from '@/lib/course-search';
import { hasSunbirdTts, SUNBIRD_LANGUAGES } from '@/lib/sunbird-languages';
import { handleMcpMessage, type JsonRpcResponse, type McpContext, type McpCourse } from '@/mcp/core';
import type { Course } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_BATCH = 20;
const ANON_LIMIT = 60;
const TOKEN_LIMIT = 240;
const WINDOW_MS = 60_000;

/** Everything a caller without a token may use: catalogue reads only. */
const PUBLIC_TOOLS = [
  'search_courses',
  'get_course',
  'get_lesson_quiz',
  'list_languages',
  'platform_status',
];

const ALL_TOOLS = [
  ...PUBLIC_TOOLS,
  'translate_text',
  'text_to_speech',
  'generate_quiz',
  'summarize_notes',
  'ocr_extract_text',
];

const TTS_LANGUAGES: ReadonlySet<string> = new Set(
  SUNBIRD_LANGUAGES.filter((language) => hasSunbirdTts(language.code)).map((language) => language.code),
);

function buildContext(authorised: boolean): McpContext {
  return {
    courses: COURSES,
    languages: SUNBIRD_LANGUAGES,
    ttsLanguages: TTS_LANGUAGES,
    searchCourses: (courses, query) =>
      searchCourses(courses as readonly Course[] as Course[], query) as readonly McpCourse[],
    env: process.env as Record<string, string | undefined>,
    disabledTools: authorised ? [] : ALL_TOOLS.filter((tool) => !PUBLIC_TOOLS.includes(tool)),
    serverVersion: '2.0.0',
    fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
  };
}

function timingSafeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

function isAuthorised(req: NextRequest): boolean {
  const expected = process.env.MCP_API_TOKEN;
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return token.length > 0 && timingSafeEqual(token, expected);
}

/**
 * A browser-sent Origin must match this host or be allow-listed, which stops a
 * page on another site from driving this endpoint with the visitor's cookies.
 */
function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;

  const host = req.headers.get('host') ?? '';
  try {
    const url = new URL(origin);
    if (host && url.host === host) return true;
  } catch {
    return false;
  }

  const allowed = (process.env.MCP_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

function jsonError(code: number, message: string, status: number): Response {
  return Response.json(
    { jsonrpc: '2.0', id: null, error: { code, message } },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!originAllowed(req)) {
    return jsonError(-32600, 'Origin is not allowed.', 403);
  }

  const authorised = isAuthorised(req);
  const limited = await rateLimit(
    `mcp:${authorised ? 'token' : 'anon'}:${clientIp(req)}`,
    authorised ? TOKEN_LIMIT : ANON_LIMIT,
    WINDOW_MS,
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(-32700, 'Parse error: invalid JSON.', 400);
  }

  const messages = Array.isArray(body) ? body : [body];
  if (messages.length === 0) {
    return new Response(null, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  }
  if (messages.length > MAX_BATCH) {
    return jsonError(-32600, `Send at most ${MAX_BATCH} messages in one batch.`, 400);
  }

  const context = buildContext(authorised);
  const responses: JsonRpcResponse[] = [];
  for (const message of messages) {
    const response = await handleMcpMessage(context, message);
    if (response) responses.push(response);
  }

  // Notifications only: nothing to say back.
  if (responses.length === 0) {
    return new Response(null, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  }

  return Response.json(Array.isArray(body) ? responses : responses[0], {
    headers: { 'Cache-Control': 'no-store' },
  });
}

function methodNotAllowed(): Response {
  return Response.json(
    { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Use POST for MCP messages.' } },
    { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } },
  );
}

export function GET(): Response {
  return methodNotAllowed();
}

export function DELETE(): Response {
  return methodNotAllowed();
}

#!/usr/bin/env node
/**
 * Model Context Protocol (MCP) Server for OCR Capabilities
 * Connects Antigravity to OCR.Space API using JSON-RPC 2.0 over stdio transport.
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';

// Dynamically load .env if running standalone
function loadEnv() {
  if (process.env.OCR_SPACE_API_KEY || process.env.OCR_SPACE_API_KEY_FALLBACK) return;
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile();
    } else {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
          const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
          if (m && !process.env[m[1]]) {
            process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
          }
        }
      }
    }
  } catch {}
}
loadEnv();

function getApiKey() {
  return process.env.OCR_SPACE_API_KEY_FALLBACK || process.env.OCR_SPACE_API_KEY || '';
}

const OCR_ENDPOINT = 'https://api.ocr.space/parse/image';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function send(message) {
  const json = JSON.stringify(message);
  process.stdout.write(json + '\n');
}

async function performOCR({ image, language = 'eng' }) {
  if (!image) {
    throw new Error('Image parameter is required (file path, URL, or base64 string)');
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OCR API key is not configured in .env (OCR_SPACE_API_KEY or OCR_SPACE_API_KEY_FALLBACK)');
  }

  const formData = new FormData();
  formData.append('apikey', apiKey);
  formData.append('language', language);
  formData.append('isOverlayRequired', 'false');

  if (image.startsWith('http://') || image.startsWith('https://')) {
    formData.append('url', image);
  } else if (image.startsWith('data:image')) {
    formData.append('base64Image', image);
  } else {
    // Treat as local file path
    const resolvedPath = path.isAbsolute(image) ? image : path.resolve(process.cwd(), image);
    if (fs.existsSync(resolvedPath)) {
      const fileBuffer = fs.readFileSync(resolvedPath);
      const ext = path.extname(resolvedPath).slice(1) || 'jpeg';
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      const base64 = `data:${mime};base64,${fileBuffer.toString('base64')}`;
      formData.append('base64Image', base64);
    } else if (image.length > 100) {
      // Possible raw base64 string without data URI prefix
      formData.append('base64Image', `data:image/jpeg;base64,${image}`);
    } else {
      throw new Error(`File not found at path: ${image}`);
    }
  }

  const res = await fetch(OCR_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`OCR.Space API returned status ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.IsErroredOnProcessing) {
    const errorMsg = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(', ') : data.ErrorMessage || 'Processing error';
    throw new Error(`OCR Processing Error: ${errorMsg}`);
  }

  const extracted = (data.ParsedResults || [])
    .map((r) => r.ParsedText || '')
    .join('\n')
    .trim();

  return extracted || '(No readable text found)';
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch (err) {
    send({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error: Invalid JSON' },
    });
    return;
  }

  const { id, method, params } = msg;

  try {
    switch (method) {
      case 'initialize': {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'ocr-space-mcp-server',
              version: '1.0.0',
            },
          },
        });
        break;
      }

      case 'notifications/initialized': {
        // Notification - no response needed
        break;
      }

      case 'ping': {
        send({
          jsonrpc: '2.0',
          id,
          result: {},
        });
        break;
      }

      case 'tools/list': {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'ocr_extract_text',
                description: 'Extract text from an image (file path, image URL, or base64) using the OCR.Space cloud engine.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    image: {
                      type: 'string',
                      description: 'The image to perform OCR on: can be an absolute/relative local file path, a web URL, or base64 data.',
                    },
                    language: {
                      type: 'string',
                      description: 'OCR recognition language (e.g., "eng", "fre", "ger", "spa", "swa"). Default: "eng".',
                      default: 'eng',
                    },
                  },
                  required: ['image'],
                },
              },
            ],
          },
        });
        break;
      }

      case 'tools/call': {
        if (!params || params.name !== 'ocr_extract_text') {
          send({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${params?.name}`,
            },
          });
          break;
        }

        try {
          const text = await performOCR(params.arguments || {});
          send({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text,
                },
              ],
            },
          });
        } catch (callErr) {
          send({
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Error during OCR extraction: ${callErr.message}`,
                },
              ],
            },
          });
        }
        break;
      }

      default: {
        if (id !== undefined && id !== null) {
          send({
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          });
        }
        break;
      }
    }
  } catch (err) {
    if (id !== undefined && id !== null) {
      send({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: err.message || 'Internal server error',
        },
      });
    }
  }
});

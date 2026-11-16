/**
 * Reading Server-Sent Events from a streaming HTTP body.
 *
 * Both LLM dialects Sautika talks to (Gemini and the OpenAI chat-completions
 * shape) deliver tokens as SSE, and a network chunk can split an event in
 * half, so the buffering lives here once.
 */

/** Yields each `data:` payload from an SSE body, in order. */
export async function* sseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Events are separated by a blank line; a chunk can split one in half.
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        for (const line of block.split('\n')) {
          const trimmed = line.trimStart();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data) yield data;
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    // Releasing the lock lets an abort actually close the socket.
    reader.releaseLock();
  }
}

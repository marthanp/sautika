/**
 * Multi-Provider AI LLM Engine
 * Supports seamless failover / routing across:
 * - Gemini (Google)
 * - OpenRouter
 * - Groq
 * - Mistral
 * - SambaNova
 * - Fireworks AI
 * - Cohere
 * - Nvidia NIM
 * - Moonshot Kimi
 * - Zhipu / ZAI
 * - Local heuristic fallback
 */

export interface LLMRequestOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateAIResponse(options: LLMRequestOptions): Promise<{ text: string; provider: string }> {
  const { prompt, systemPrompt, maxTokens = 1200, temperature = 0.5 } = options;

  // 1. Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
      });
      if (res.ok) {
        const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { text, provider: 'Google Gemini' };
      }
    } catch (e) {
      console.warn('Gemini request failed, falling back:', e);
    }
  }

  // 2. Groq (High Speed)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'Groq' };
      }
    } catch (e) {
      console.warn('Groq request failed, falling back:', e);
    }
  }

  // 3. OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'OpenRouter' };
      }
    } catch (e) {
      console.warn('OpenRouter request failed, falling back:', e);
    }
  }

  // 4. Mistral AI
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mistralKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'Mistral' };
      }
    } catch (e) {
      console.warn('Mistral request failed, falling back:', e);
    }
  }

  // 5. SambaNova
  const sambanovaKey = process.env.SAMBANOVA_API_KEY;
  if (sambanovaKey) {
    try {
      const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sambanovaKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'Meta-Llama-3.1-70B-Instruct',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'SambaNova' };
      }
    } catch (e) {
      console.warn('SambaNova request failed, falling back:', e);
    }
  }

  // 6. Fireworks AI
  const fireworksKey = process.env.FIREWORKS_API_KEY;
  if (fireworksKey) {
    try {
      const res = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${fireworksKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'Fireworks AI' };
      }
    } catch (e) {
      console.warn('Fireworks request failed, falling back:', e);
    }
  }

  // 7. Nvidia NIM
  const nvidiaKey = process.env.NVIDIA_NIM_API_KEY;
  if (nvidiaKey) {
    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${nvidiaKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.1-70b-instruct',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'NVIDIA NIM' };
      }
    } catch (e) {
      console.warn('NVIDIA NIM request failed, falling back:', e);
    }
  }

  // 8. Moonshot Kimi
  const kimiKey = process.env.KIMI_API_KEY;
  if (kimiKey) {
    try {
      const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${kimiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'Moonshot Kimi' };
      }
    } catch (e) {
      console.warn('Kimi request failed, falling back:', e);
    }
  }


  // 10. Zhipu / ZAI
  const zaiKey = process.env.ZAI_API_KEY;
  if (zaiKey) {
    try {
      const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${zaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'Zhipu ZAI' };
      }
    } catch (e) {
      console.warn('ZAI request failed, falling back:', e);
    }
  }

  // 11. Cohere
  const cohereKey = process.env.COHERE_API_KEY;
  if (cohereKey) {
    try {
      const res = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cohereKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          preamble: systemPrompt,
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { text?: string };
        if (data.text) return { text: data.text, provider: 'Cohere' };
      }
    } catch (e) {
      console.warn('Cohere request failed, falling back:', e);
    }
  }

  // Default clean smart extractor if no external keys configured
  return {
    text: generateHeuristicSummary(prompt),
    provider: 'Built-in Educational Engine',
  };
}

/** Local heuristic summary when no API key is yet populated in .env */
function generateHeuristicSummary(content: string): string {
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && !l.startsWith('#'));

  const highlights = lines.slice(0, 5);
  if (!highlights.length) {
    return 'Summary of study notes: Key concepts from the document have been organized for revision.';
  }

  return (
    `• Key Concept 1: ${highlights[0]}\n` +
    (highlights[1] ? `• Key Concept 2: ${highlights[1]}\n` : '') +
    (highlights[2] ? `• Key Concept 3: ${highlights[2]}\n` : '') +
    `\nStudy Tip: Review these core concepts and test yourself with lesson quizzes.`
  );
}

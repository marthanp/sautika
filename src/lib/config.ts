/**
 * Centralized, Strongly-Typed Server Configuration & Environment Variable Mapping.
 * 
 * IMPORTANT:
 * - This module is strictly for server-side runtime code (Node.js API routes, Server Components, server actions).
 * - Sensitive API keys must NEVER be exposed to the browser client or logged in plaintext.
 */

export const serverConfig = {
  // 1. Database
  mongodb: {
    uri: process.env.MONGODB_URI ?? process.env.MONGO_URI ?? '',
  },

  // 2. Cloudflare R2 Storage
  r2: {
    endpoint: process.env.R2_ENDPOINT ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucketName: process.env.R2_BUCKET_NAME ?? 'sautika-media',
    publicUrl: process.env.R2_PUBLIC_URL ?? '',
  },

  // 3. Clerk Authentication
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
    secretKey: process.env.CLERK_SECRET_KEY ?? '',
    signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? '/sign-in',
    signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? '/sign-up',
  },

  // 4. Sunbird AI (Speech-to-Text & Text-to-Speech for East African Languages)
  sunbird: {
    apiKey: process.env.SUNBIRD_API_KEY ?? '',
    apiUrl: (process.env.SUNBIRD_API_URL ?? 'https://api.sunbird.ai').replace(/\/+$/, ''),
  },

  // 5. Document OCR Engines
  ocr: {
    primaryKey: process.env.OCR_SPACE_API_KEY ?? '',
    fallbackKey: process.env.OCR_SPACE_API_KEY_FALLBACK ?? '',
    getKeys(): string[] {
      return Array.from(new Set([this.primaryKey, this.fallbackKey])).filter(Boolean);
    },
  },

  // 6. Multi-Provider AI LLM Engines
  llm: {
    geminiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY,
    groqKey: process.env.GROQ_API_KEY,
    openrouterKey: process.env.OPENROUTER_API_KEY,
    mistralKey: process.env.MISTRAL_API_KEY,
    sambanovaKey: process.env.SAMBANOVA_API_KEY,
    fireworksKey: process.env.FIREWORKS_API_KEY,
    nvidiaKey: process.env.NVIDIA_NIM_API_KEY ?? process.env.NVIDIA_API_KEY,
    kimiKey: process.env.KIMI_API_KEY ?? process.env.MOONSHOT_API_KEY,
    zaiKey: process.env.ZAI_API_KEY ?? process.env.ZHIPU_API_KEY,
    cohereKey: process.env.COHERE_API_KEY,
  },
};

/**
 * Safely mask an API key for safe debugging or diagnostics without leaking secrets.
 * Example: "sk-proj-1234567890abcdef" -> "...cdef"
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '(not configured)';
  if (secret.length <= 8) return '********';
  return `...${secret.slice(-4)}`;
}

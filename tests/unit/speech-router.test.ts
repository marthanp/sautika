import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  acceptTranscript,
  chooseProvider,
  englishConfidenceThreshold,
  speechModels,
} from '@/lib/speech/router';

/**
 * The decision table from the brief, as tests.
 *
 * AssemblyAI is the ears for English; Sunbird handles the Ugandan and East
 * African languages and catches anything AssemblyAI is unsure about.
 */

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('chooseProvider', () => {
  const both = { assembly: true, sunbird: true };

  it('sends English to AssemblyAI', () => {
    const decision = chooseProvider({ language: 'eng', ...both });
    expect(decision?.provider).toBe('assemblyai');
    expect(decision?.mayFallBack).toBe(true);
  });

  it('sends auto to AssemblyAI', () => {
    expect(chooseProvider({ language: 'auto', ...both })?.provider).toBe('assemblyai');
    expect(chooseProvider({ language: '', ...both })?.provider).toBe('assemblyai');
  });

  it('sends each Sunbird language to Sunbird', () => {
    for (const language of ['lug', 'ach', 'teo', 'nyn', 'xog', 'ttj', 'swa', 'kin']) {
      const decision = chooseProvider({ language, ...both });
      expect(decision?.provider, language).toBe('sunbird');
      // Sunbird is the specialist here: there is nowhere better to fall back to.
      expect(decision?.mayFallBack, language).toBe(false);
    }
  });

  it('sends English to Sunbird when AssemblyAI has no key', () => {
    const decision = chooseProvider({ language: 'eng', assembly: false, sunbird: true });
    expect(decision?.provider).toBe('sunbird');
    expect(decision?.reason).toContain('AssemblyAI');
  });

  it('keeps English on AssemblyAI with no Sunbird, but cannot fall back', () => {
    const decision = chooseProvider({ language: 'eng', assembly: true, sunbird: false });
    expect(decision?.provider).toBe('assemblyai');
    expect(decision?.mayFallBack).toBe(false);
  });

  it('refuses a Sunbird language when Sunbird has no key', () => {
    // Guessing in the wrong language is worse than saying it is unavailable.
    expect(chooseProvider({ language: 'lug', assembly: true, sunbird: false })).toBeNull();
  });

  it('refuses everything when neither provider is configured', () => {
    expect(chooseProvider({ language: 'eng', assembly: false, sunbird: false })).toBeNull();
    expect(chooseProvider({ language: 'lug', assembly: false, sunbird: false })).toBeNull();
  });

  it('ignores case and stray whitespace in the language', () => {
    expect(chooseProvider({ language: '  LUG ', ...both })?.provider).toBe('sunbird');
    expect(chooseProvider({ language: ' ENG ', ...both })?.provider).toBe('assemblyai');
  });
});

describe('acceptTranscript', () => {
  it('accepts confident English', () => {
    const verdict = acceptTranscript({
      text: 'Why do plants need sunlight?',
      languageCode: 'en',
      confidence: 0.95,
      threshold: 0.8,
    });
    expect(verdict.accept).toBe(true);
  });

  it('accepts a regional English code', () => {
    for (const code of ['en_us', 'en_au', 'en-GB']) {
      expect(
        acceptTranscript({ text: 'hello', languageCode: code, confidence: 0.9, threshold: 0.8 })
          .accept,
        code,
      ).toBe(true);
    }
  });

  it('rejects English below the confidence threshold, for Sunbird to retry', () => {
    const verdict = acceptTranscript({
      text: 'something indistinct',
      languageCode: 'en',
      confidence: 0.55,
      threshold: 0.8,
    });
    expect(verdict.accept).toBe(false);
    expect(verdict.reason).toContain('0.55');
  });

  it('rejects a transcript detected as another language', () => {
    const verdict = acceptTranscript({
      text: 'Lwaki ebimera byetaaga omusana?',
      languageCode: 'sw',
      confidence: 0.99,
      threshold: 0.8,
    });
    expect(verdict.accept).toBe(false);
    expect(verdict.reason).toContain('sw');
  });

  it('rejects an empty transcript whatever the confidence', () => {
    expect(acceptTranscript({ text: '   ', languageCode: 'en', confidence: 1 }).accept).toBe(false);
  });

  it('accepts English when the provider reported no confidence at all', () => {
    expect(acceptTranscript({ text: 'hello', languageCode: 'en', threshold: 0.8 }).accept).toBe(true);
  });

  it('rejects a transcript with no language code', () => {
    expect(acceptTranscript({ text: 'hello', threshold: 0.8 }).accept).toBe(false);
  });

  it('treats the threshold as inclusive at the boundary', () => {
    expect(
      acceptTranscript({ text: 'hello', languageCode: 'en', confidence: 0.8, threshold: 0.8 })
        .accept,
    ).toBe(true);
  });
});

describe('configuration', () => {
  it('defaults the English confidence threshold to 0.8', () => {
    expect(englishConfidenceThreshold()).toBe(0.8);
  });

  it('reads the threshold from the environment', () => {
    vi.stubEnv('ASSEMBLYAI_EN_CONFIDENCE', '0.65');
    expect(englishConfidenceThreshold()).toBe(0.65);
  });

  it('ignores a threshold outside 0 to 1', () => {
    vi.stubEnv('ASSEMBLYAI_EN_CONFIDENCE', '4');
    expect(englishConfidenceThreshold()).toBe(0.8);
  });

  it('defaults to the current model with universal-2 behind it', () => {
    expect(speechModels()).toEqual(['universal-3-5-pro', 'universal-2']);
  });

  it('reads an override list from the environment', () => {
    vi.stubEnv('ASSEMBLYAI_SPEECH_MODELS', 'universal-2');
    expect(speechModels()).toEqual(['universal-2']);
  });
});

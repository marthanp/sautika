'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic } from 'lucide-react';
import { useVoice } from '@/lib/useVoice';
import { isSunbirdLanguage, SUNBIRD_LANGUAGES, type VoiceLang } from '@/lib/sunbird-languages';

export default function VoiceCourseSearch() {
  const router = useRouter();
  const { recording, toggleMic } = useVoice();
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<VoiceLang>('eng');

  async function searchCourses(text: string): Promise<void> {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLanguage: language, targetLanguage: 'eng' }),
      });
      const result = await response.json() as { text?: string; error?: string };
      if (!response.ok || !result.text) {
        throw new Error(result.error ?? 'Could not translate your course search.');
      }
      router.push(`/courses?q=${encodeURIComponent(result.text)}`);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Could not translate your course search.');
    }
  }

  function handleMicClick(): void {
    setError('');
    void toggleMic(
      language,
      (text) => { void searchCourses(text); },
      setError,
    );
  }

  return (
    <div className="mt-4">
      <label htmlFor="voice-search-language" className="mr-2 text-sm font-semibold">Speak in</label>
      <select
        id="voice-search-language"
        value={language}
        onChange={(event) => {
          if (isSunbirdLanguage(event.target.value)) setLanguage(event.target.value);
        }}
        className="mb-3 min-h-10 max-w-full rounded-xl border-2 border-ln bg-card px-3 text-sm"
      >
        {SUNBIRD_LANGUAGES.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
      </select>
      <button
        type="button"
        aria-label={recording ? 'Stop speaking to Sautika' : 'Speak to Sautika'}
        aria-pressed={recording}
        onClick={handleMicClick}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${
          recording ? 'animate-[pulse-ring_1s_infinite] bg-red-100 text-red-800' : 'bg-navy text-white hover:bg-navy/90'
        }`}
      >
        <Mic className="h-4 w-4" aria-hidden="true" />
        {recording ? 'Listening… Tap to finish' : 'Speak to Sautika'}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
      <p role="status" aria-live="polite" className="sr-only">{recording ? 'Listening for your search.' : ''}</p>
    </div>
  );
}

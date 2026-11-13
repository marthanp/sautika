'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Languages, Mic } from 'lucide-react';
import { useVoice } from '@/lib/useVoice';
import { isSunbirdLanguage, SUNBIRD_LANGUAGES } from '@/lib/sunbird-languages';
import { useApp } from '@/store/useApp';

export default function VoiceCourseSearch() {
  const router = useRouter();
  const { recording, toggleMic } = useVoice();
  const [error, setError] = useState('');
  const dialect = useApp((s) => s.dialect);
  const setDialect = useApp((s) => s.setDialect);

  async function searchCourses(text: string): Promise<void> {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLanguage: dialect, targetLanguage: 'eng' }),
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
      dialect,
      (text) => { void searchCourses(text); },
      setError,
    );
  }

  const selectedName = SUNBIRD_LANGUAGES.find((l) => l.code === dialect)?.name ?? 'English';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Dialect selector */}
      <label className="flex items-center gap-2 rounded-xl border border-line bg-white/70 px-3 py-1.5 shadow-sm text-[13.5px] font-semibold text-navy backdrop-blur">
        <Languages className="h-4 w-4 shrink-0 text-navy/70" aria-hidden="true" />
        <span className="sr-only">Dialect</span>
        Dialect:&nbsp;
        <select
          aria-label="Select dialect for voice search and UI translation"
          value={dialect}
          onChange={(e) => {
            if (isSunbirdLanguage(e.target.value)) setDialect(e.target.value);
          }}
          className="max-w-[130px] cursor-pointer bg-transparent font-bold text-navy focus:outline-none"
        >
          {SUNBIRD_LANGUAGES.map(({ code, name }) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </label>

      {/* Mic button */}
      <button
        type="button"
        aria-label={recording ? `Stop speaking in ${selectedName}` : `Speak to Sautika in ${selectedName}`}
        aria-pressed={recording}
        onClick={handleMicClick}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${
          recording ? 'animate-[pulse-ring_1s_infinite] bg-red-100 text-red-800' : 'bg-navy text-white hover:bg-navy/90'
        }`}
      >
        <Mic className="h-4 w-4" aria-hidden="true" />
        {recording ? 'Listening… Tap to finish' : 'Speak to Sautika'}
      </button>

      {error ? <p role="alert" className="w-full text-sm text-red-700">{error}</p> : null}
      <p role="status" aria-live="polite" className="sr-only">{recording ? `Listening for your search in ${selectedName}.` : ''}</p>
    </div>
  );
}

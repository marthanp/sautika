'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useVoice } from '@/lib/useVoice';
import { useApp } from '@/store/useApp';
import { isSunbirdLanguage, SUNBIRD_LANGUAGES, type VoiceLang } from '@/lib/sunbird-languages';
import VoiceStateOrb from '@/components/VoiceStateOrb';

export default function VoiceCourseSearch() {
  const router = useRouter();
  const globalDialect = useApp((state) => state.activeDialect || 'lug');
  const setGlobalDialect = useApp((state) => state.setActiveDialect);
  const { recording, processing, toggleMic } = useVoice();
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<VoiceLang>(globalDialect);
  const [transcript, setTranscript] = useState<{ raw: string; translated?: string } | null>(null);

  // Sync with global dialect selection
  useEffect(() => {
    if (globalDialect && isSunbirdLanguage(globalDialect)) {
      setLanguage(globalDialect);
    }
  }, [globalDialect]);

  const activeLangName = SUNBIRD_LANGUAGES.find((l) => l.code === language)?.name || 'Local dialect';

  async function searchCourses(text: string): Promise<void> {
    setTranscript({ raw: text });
    try {
      if (language === 'eng') {
        router.push(`/courses?q=${encodeURIComponent(text)}`);
        return;
      }
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLanguage: language, targetLanguage: 'eng' }),
      });
      const result = await response.json() as { text?: string; error?: string };
      if (!response.ok || !result.text) {
        throw new Error(result.error ?? 'Could not translate your course search.');
      }
      setTranscript({ raw: text, translated: result.text });
      setTimeout(() => {
        router.push(`/courses?q=${encodeURIComponent(result.text!)}`);
      }, 700);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Could not translate your course search.');
    }
  }

  function handleMicClick(): void {
    setError('');
    setTranscript(null);
    void toggleMic(
      language,
      (text) => { void searchCourses(text); },
      setError,
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex items-center gap-3">
        {/* Language selector dropdown */}
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold shadow-sm dark:border-white/10 dark:bg-navy-2/90">
          <label htmlFor="voice-search-language" className="text-slate-500 dark:text-slate-400">
            Dialect:
          </label>
          <select
            id="voice-search-language"
            value={language}
            onChange={(event) => {
              if (isSunbirdLanguage(event.target.value)) {
                setLanguage(event.target.value);
                setGlobalDialect(event.target.value);
              }
            }}
            className="bg-transparent font-bold text-slate-800 outline-none dark:text-slate-100"
          >
            {SUNBIRD_LANGUAGES.map(({ code, name }) => (
              <option key={code} value={code} className="dark:bg-navy dark:text-white">
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Micro-Spring Physics Voice State Indicator Orb */}
        <VoiceStateOrb
          isRecording={recording}
          isProcessing={processing}
          onClick={handleMicClick}
          size="sm"
          activeDialectName={activeLangName}
          label="Voice Search"
        />
      </div>

      {/* Kinetic Staggered Entry for Transcript Preview */}
      {transcript && (
        <div className="animate-kinetic-entry mt-2 max-w-xs rounded-2xl border border-sun/40 bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:bg-navy-2/95">
          <div className="flex items-center gap-1.5 font-bold text-sun">
            <Sparkles className="h-3 w-3" />
            <span>Heard in {activeLangName}:</span>
          </div>
          <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">"{transcript.raw}"</p>
          {transcript.translated && (
            <div className="animate-kinetic-entry stagger-1 mt-1.5 border-t border-slate-100 pt-1.5 text-[11px] text-slate-500 dark:border-white/10 dark:text-slate-300">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Searching:</span> "{transcript.translated}"
            </div>
          )}
        </div>
      )}

      {error ? (
        <p role="alert" className="animate-kinetic-entry text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

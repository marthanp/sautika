'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Compass, BookOpen, Languages, Atom } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import { useApp } from '@/store/useApp';
import { isSunbirdLanguage, SUNBIRD_LANGUAGES, type VoiceLang } from '@/lib/sunbird-languages';
import VoiceStateOrb from '@/components/voice/VoiceStateOrb';
import AudioWaveformVisualizer from '@/components/voice/AudioWaveformVisualizer';
import QuickPromptChips, { type QuickPrompt } from '@/components/voice/QuickPromptChips';
import { triggerFeedback } from '@/lib/feedback';

export default function VoiceCourseSearch() {
  const router = useRouter();
  const globalDialect = useApp((state) => state.activeDialect || 'lug');
  const setGlobalDialect = useApp((state) => state.setActiveDialect);
  const { recording, processing, analyser, toggleMic } = useVoice();
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<VoiceLang>(globalDialect);
  const [transcript, setTranscript] = useState<{ raw: string; translated?: string } | null>(null);
  const [showPrompts, setShowPrompts] = useState(false);

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
        triggerFeedback('success');
        setShowPrompts(true);
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
      triggerFeedback('success');
      setTranscript({ raw: text, translated: result.text });
      setShowPrompts(true);
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
    setShowPrompts(false);
    void toggleMic(
      language,
      (text) => { void searchCourses(text); },
      setError,
    );
  }

  // Contextual quick prompt suggestions
  const contextualPrompts = useMemo<QuickPrompt[]>(() => {
    return [
      {
        id: 'p4-science',
        label: 'P.4 Science',
        sublabel: 'Primary',
        icon: <Atom className="h-3.5 w-3.5" />,
        action: () => router.push('/courses?q=Science%20P.4'),
      },
      {
        id: 'math-top-class',
        label: 'Top Class Math',
        sublabel: 'Nursery',
        icon: <BookOpen className="h-3.5 w-3.5" />,
        action: () => router.push('/courses?q=Mathematics%20Top%20Class'),
      },
      {
        id: 'switch-swa',
        label: 'Swahili Courses',
        sublabel: 'Dialect',
        icon: <Languages className="h-3.5 w-3.5" />,
        action: () => {
          setLanguage('swa');
          setGlobalDialect('swa');
          router.push('/courses?q=Swahili');
        },
      },
      {
        id: 'explore-all',
        label: 'Study Hub Explorer',
        sublabel: 'Browse',
        icon: <Compass className="h-3.5 w-3.5" />,
        action: () => router.push('/courses'),
      },
    ];
  }, [router, setGlobalDialect]);

  return (
    <div className="flex flex-col items-start gap-2.5 sm:items-end">
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
                triggerFeedback('chip');
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

        {/* Live dynamic audio visualizer indicator when recording */}
        {recording && (
          <div className="animate-kinetic-entry flex items-center gap-2 rounded-full border border-red-300 bg-red-50/90 px-3 py-1 text-xs font-semibold text-red-600 shadow-sm backdrop-blur dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="hidden sm:inline">Listening in {activeLangName}</span>
            <AudioWaveformVisualizer
              analyser={analyser}
              isRecording={recording}
              mode="bars"
              barCount={7}
              color="gradient"
            />
          </div>
        )}

        {/* Micro-Spring Physics Voice State Indicator Orb with Live Waveform */}
        <VoiceStateOrb
          isRecording={recording}
          isProcessing={processing}
          analyser={analyser}
          onClick={handleMicClick}
          size="sm"
          activeDialectName={activeLangName}
          label="Voice Search"
        />
      </div>

      {/* Kinetic Staggered Entry for Transcript Preview */}
      {transcript && (
        <div className="animate-kinetic-entry mt-1 max-w-xs rounded-2xl border border-sun/40 bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:bg-navy-2/95">
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

      {/* Contextual Quick-Prompt Chips (Ephemeral suggestions) */}
      {showPrompts && (
        <QuickPromptChips
          prompts={contextualPrompts}
          title="Try these searches"
          onDismiss={() => setShowPrompts(false)}
          className="mt-1 max-w-md"
        />
      )}

      {error ? (
        <p role="alert" className="animate-kinetic-entry text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic } from 'lucide-react';
import { useVoice } from '@/lib/useVoice';

export default function VoiceCourseSearch() {
  const router = useRouter();
  const { recording, toggleMic } = useVoice();
  const [error, setError] = useState('');

  function handleMicClick(): void {
    setError('');
    void toggleMic(
      'en',
      (text) => router.push(`/courses?q=${encodeURIComponent(text)}`),
      setError,
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-label={recording ? 'Stop voice search' : 'Search courses by voice'}
        aria-pressed={recording}
        onClick={handleMicClick}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${
          recording ? 'animate-[pulse-ring_1s_infinite] bg-red-100 text-red-800' : 'bg-navy text-white hover:bg-navy/90'
        }`}
      >
        <Mic className="h-4 w-4" aria-hidden="true" />
        {recording ? 'Listening… Tap to finish' : 'Speak to find a course'}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
      <p role="status" aria-live="polite" className="sr-only">{recording ? 'Listening for your search.' : ''}</p>
    </div>
  );
}

'use client';
import { useRef, useState } from 'react';
import type { VoiceLang } from '@/types';

const BROWSER_LANG: Record<VoiceLang, string> = { en: 'en-GB', swa: 'sw-KE', lug: 'sw-KE' };

export function useVoice() {
  const [recording, setRecording] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);

  /** Push-to-talk: first call starts recording, second call stops and transcribes via /api/stt. */
  async function toggleMic(lang: VoiceLang, onText: (t: string) => void): Promise<void> {
    if (rec.current) { rec.current.stop(); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream);
    rec.current = r;
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstart = () => setRecording(true);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      rec.current = null; setRecording(false);
      const form = new FormData();
      form.append('audio', new Blob(chunks, { type: r.mimeType }), 'speech.webm');
      form.append('language', lang);
      try {
        const res = await fetch('/api/stt', { method: 'POST', body: form });
        const j = (await res.json()) as { text?: string };
        if (j.text) onText(j.text);
      } catch { /* offline: ignore, learner can type */ }
    };
    r.start();
  }

  /** Sunbird TTS first; falls back to the browser voice (no Luganda voice offline). */
  async function speak(text: string, lang: VoiceLang): Promise<void> {
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language: lang }) });
      const j = (await res.json()) as { audioUrl?: string };
      if (j.audioUrl) { await new Audio(j.audioUrl).play(); return; }
    } catch { /* fall through */ }
    if (lang === 'lug') return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = BROWSER_LANG[lang]; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  return { recording, toggleMic, speak };
}

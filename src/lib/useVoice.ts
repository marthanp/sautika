'use client';
import { useRef, useState } from 'react';
import type { VoiceLang } from '@/types';
import { normalizeSunbirdLanguage } from '@/lib/sunbird-languages';

const BROWSER_LANG: Partial<Record<VoiceLang, string>> = { eng: 'en-GB', swa: 'sw-KE' };

export function useVoice() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);

  /** Push-to-talk: first call starts recording, second call stops and transcribes via /api/stt. */
  async function toggleMic(lang: VoiceLang, onText: (t: string) => void, onError?: (message: string) => void): Promise<void> {
    if (rec.current) { rec.current.stop(); return; }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not access the microphone.';
      if (onError) onError(message);
      else console.error('Microphone access failed:', error);
      return;
    }
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream);
    rec.current = r;
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstart = () => {
      setRecording(true);
      setProcessing(false);
    };
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      rec.current = null;
      setRecording(false);
      setProcessing(true);
      const form = new FormData();
      form.append('audio', new Blob(chunks, { type: r.mimeType }), 'speech.webm');
      form.append('language', normalizeSunbirdLanguage(lang));
      try {
        const res = await fetch('/api/stt', { method: 'POST', body: form });
        const j = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) throw new Error(j.error ?? 'Speech transcription is temporarily unavailable.');
        if (!j.text?.trim()) throw new Error('No speech was recognized. Please try again.');
        onText(j.text.trim());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Speech transcription failed.';
        if (onError) onError(message);
        else console.error('Speech transcription failed:', error);
      } finally {
        setProcessing(false);
      }
    };
    r.start();
  }

  /** Sunbird TTS first; falls back to the browser voice (no Luganda voice offline). */
  async function speak(text: string, lang: VoiceLang): Promise<void> {
    setSpeaking(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: normalizeSunbirdLanguage(lang) }),
      });
      const j = (await res.json()) as { audioUrl?: string };
      if (j.audioUrl) {
        const audio = new Audio(j.audioUrl);
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
        return;
      }
    } catch {
      /* fall through to browser speech */
    }
    const browserLanguage = BROWSER_LANG[lang];
    if (!browserLanguage) {
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = browserLanguage;
    u.rate = 0.9;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  return { recording, processing, speaking, toggleMic, speak };
}

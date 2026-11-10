'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { VoiceLang } from '@/types';
import { normalizeSunbirdLanguage } from '@/lib/sunbird-languages';
import { triggerFeedback } from '@/lib/feedback';

const BROWSER_LANG: Partial<Record<VoiceLang, string>> = { eng: 'en-GB', swa: 'sw-KE' };

export function useVoice() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const rec = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Teardown Web Audio analyzer safely
  const cleanupAudioGraph = useCallback(() => {
    try {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    } catch {
      // Ignore cleanup errors
    }
    setAnalyser(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioGraph();
      if (rec.current && rec.current.state !== 'inactive') {
        rec.current.stop();
      }
    };
  }, [cleanupAudioGraph]);

  /** Push-to-talk: first call starts recording, second call stops and transcribes via /api/stt. */
  async function toggleMic(
    lang: VoiceLang,
    onText: (t: string) => void,
    onError?: (message: string) => void
  ): Promise<void> {
    if (rec.current) {
      triggerFeedback('record-stop');
      rec.current.stop();
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not access the microphone.';
      if (onError) onError(message);
      else console.error('Microphone access failed:', error);
      return;
    }

    // Initialize Web Audio API Analyser for real-time visualization
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;
        if (audioCtx.state === 'suspended') {
          void audioCtx.resume().catch(() => {});
        }
        const sourceNode = audioCtx.createMediaStreamSource(stream);
        sourceNodeRef.current = sourceNode;

        const analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 64; // 32 frequency bins, performant for smooth 60fps rendering
        analyserNode.smoothingTimeConstant = 0.8;
        sourceNode.connect(analyserNode);
        // Note: Do not connect analyserNode to destination to prevent mic feedback echo

        analyserRef.current = analyserNode;
        setAnalyser(analyserNode);
      }
    } catch (err) {
      console.warn('Web Audio Analyser initialization skipped:', err);
    }

    triggerFeedback('record-start');

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
      cleanupAudioGraph();
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

        triggerFeedback('success');
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
    triggerFeedback('chip');
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

  return { recording, processing, speaking, analyser, toggleMic, speak };
}

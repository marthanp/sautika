'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { VoiceLang } from '@/types';
import { normalizeSunbirdLanguage } from '@/lib/sunbird-languages';
import { triggerFeedback } from '@/lib/feedback';

const BROWSER_LANG: Partial<Record<VoiceLang, string>> = {
  eng: 'en-GB',
  swa: 'sw-KE',
  lug: 'lg-UG',
  ach: 'ach-UG',
  teo: 'teo-UG',
  nyn: 'nyn-UG',
  luo: 'luo-KE',
  kik: 'ki-KE',
  kin: 'rw-RW',
  ibo: 'ig-NG',
  yor: 'yo-NG',
  hau: 'ha-NG',
  zul: 'zu-ZA',
  xho: 'xh-ZA',
  afr: 'af-ZA',
  som: 'so-SO',
  amh: 'am-ET',
};

export function useVoice() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const rec = useRef<MediaRecorder | null>(null);
  /** The clip playing now, so read-aloud can be stopped part way. */
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
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

  /**
   * Push-to-talk: first call starts recording, second call stops and
   * transcribes via /api/stt.
   *
   * `onText` receives the transcript and is expected to act on it. In the
   * notebook that means asking the question, not just filling the box: a
   * voice-first app that makes you press send after speaking has not answered
   * you.
   *
   * `notebookId` lets the route pass that notebook's source-guide topics to
   * the recogniser as key terms, so subject words are heard correctly.
   */
  async function toggleMic(
    lang: VoiceLang,
    onText: (text: string, meta?: { language: string; provider: string }) => void,
    onError?: (message: string) => void,
    options: { notebookId?: string } = {},
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
      // Subject vocabulary from this notebook's sources, when there is one.
      if (options.notebookId) form.append('notebookId', options.notebookId);

      try {
        const res = await fetch('/api/stt', { method: 'POST', body: form });
        const j = (await res.json()) as {
          text?: string;
          language?: string;
          provider?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(j.error ?? 'Speech transcription is temporarily unavailable.');
        if (!j.text?.trim()) throw new Error('No speech was recognized. Please try again.');

        triggerFeedback('success');
        onText(j.text.trim(), {
          language: j.language ?? normalizeSunbirdLanguage(lang),
          provider: j.provider ?? 'unknown',
        });
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

  /**
   * Sunbird TTS first; falls back to the browser voice (no Luganda voice
   * offline).
   *
   * `/api/tts` returns an ordered playlist of segments rather than one clip,
   * so a long answer is read all the way through instead of being cut at 600
   * characters. `onSegment` reports which span is playing, which is what the
   * sentence highlighting in reading-comfort mode follows.
   */
  async function speak(
    text: string,
    lang: VoiceLang,
    options: {
      onSegment?: (segment: { ord: number; charStart: number; charEnd: number } | null) => void;
      rate?: number;
    } = {},
  ): Promise<void> {
    setSpeaking(true);
    triggerFeedback('chip');
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: normalizeSunbirdLanguage(lang) }),
      });
      const j = (await res.json()) as {
        segments?: { ord: number; charStart: number; charEnd: number; audioUrl?: string }[];
        audioUrl?: string;
      };

      const playlist = (j.segments ?? []).filter((segment) => segment.audioUrl);
      if (playlist.length > 0) {
        for (const segment of playlist) {
          options.onSegment?.(segment);
          const finished = await new Promise<boolean>((resolve) => {
            const audio = new Audio(segment.audioUrl);
            if (options.rate) audio.playbackRate = options.rate;
            audio.onended = () => resolve(true);
            // A failed segment should not stop the rest of the answer.
            audio.onerror = () => resolve(true);
            currentAudioRef.current = audio;
            void audio.play().catch(() => resolve(false));
          });
          if (!finished) break;
        }
        currentAudioRef.current = null;
        options.onSegment?.(null);
        setSpeaking(false);
        return;
      }

      if (j.audioUrl) {
        const audio = new Audio(j.audioUrl);
        currentAudioRef.current = audio;
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        await audio.play();
        return;
      }
    } catch {
      /* fall through to browser speech */
    }
    const browserLanguage = BROWSER_LANG[lang] || 'en-GB';
    const u = new SpeechSynthesisUtterance(text);
    u.lang = browserLanguage;
    u.rate = options.rate ?? 0.9;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  /** Stops read-aloud wherever it has got to. */
  function stopSpeaking(): void {
    const audio = currentAudioRef.current;
    if (audio) {
      audio.pause();
      currentAudioRef.current = null;
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    setSpeaking(false);
  }

  return { recording, processing, speaking, analyser, toggleMic, speak, stopSpeaking };
}

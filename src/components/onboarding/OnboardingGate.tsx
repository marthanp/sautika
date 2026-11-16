'use client';

import { useCallback, useEffect, useState } from 'react';
import Onboarding from '@/components/onboarding/Onboarding';
import { useApp } from '@/store/useApp';

/**
 * Decides whether the tutorial should run.
 *
 * It shows on a first sign-in — no `onboardingCompletedAt` in `user_settings`
 * — and can be replayed from Settings or Help by setting
 * `sautika-replay-onboarding` in session storage.
 *
 * Progress is mirrored in the store as well as saved on the server, so a
 * learner who finishes the tutorial offline is not shown it again when the
 * connection comes back.
 */

const REPLAY_KEY = 'sautika-replay-onboarding';

/** Marks the tutorial as handled locally, so it survives a refresh offline. */
function rememberLocally(): void {
  try {
    window.localStorage.setItem('sautika-onboarded', '1');
  } catch {
    // A private window with storage blocked: the server copy is the backstop.
  }
}

function seenLocally(): boolean {
  try {
    return window.localStorage.getItem('sautika-onboarded') === '1';
  } catch {
    return false;
  }
}

export default function OnboardingGate() {
  const [show, setShow] = useState(false);
  const [sampleNotebookId, setSampleNotebookId] = useState<string | null>(null);
  const dialect = useApp((state) => state.dialect);

  const decide = useCallback(async (): Promise<{
    show: boolean;
    sample: string | null;
  } | null> => {
    let replay = false;
    try {
      replay = window.sessionStorage.getItem(REPLAY_KEY) === '1';
      if (replay) window.sessionStorage.removeItem(REPLAY_KEY);
    } catch {
      // Storage blocked: fall through to the server's answer.
    }

    if (!replay && seenLocally()) return { show: false, sample: null };

    try {
      const response = await fetch('/api/onboarding');
      if (!response.ok) return { show: false, sample: null };
      const result = (await response.json()) as {
        completedAt?: string | null;
        sampleNotebookId?: string | null;
      };
      return {
        show: replay || !result.completedAt,
        sample: result.sampleNotebookId ?? null,
      };
    } catch {
      // Offline on a first run: better to stay quiet than to block the app.
      return { show: false, sample: null };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void decide().then((result) => {
      if (cancelled || !result) return;
      setSampleNotebookId(result.sample);
      setShow(result.show);
    });
    return () => {
      cancelled = true;
    };
  }, [decide]);

  const finish = (completed: boolean): void => {
    setShow(false);
    rememberLocally();

    // Saved with the chosen language, so the next visit starts in it.
    void fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed, step: completed ? 4 : 0, language: dialect }),
    }).catch(() => {
      // The local flag already stops it reappearing; the server catches up.
    });
  };

  if (!show) return null;
  return <Onboarding sampleNotebookId={sampleNotebookId} onFinish={finish} />;
}

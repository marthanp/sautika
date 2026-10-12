'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/useApp';

interface AccountResponse {
  hasExistingData: boolean;
  appState: {
    xp: number;
    streak: number;
    enrolled: string[];
    done: Record<string, number>;
    activeCourse: string | null;
  };
  settings: {
    theme: 'navy' | 'parchment' | 'contrast';
    colorMode: 'light' | 'dark';
    font: 'default' | 'opendyslexic' | 'lexend' | 'atkinson' | 'comic-neue';
    scale: string;
    wide: boolean;
    letterSpacing: 'normal' | 'relaxed' | 'wide';
    lineHeight: 'normal' | 'relaxed' | 'loose';
    readingTint: 'none' | 'cream' | 'yellow' | 'peach' | 'mint' | 'blue';
  };
}

async function requestAccount(body?: unknown): Promise<AccountResponse> {
  const response = await fetch('/api/account', {
    ...(body ? { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(result?.error ?? 'Could not sync your learner data.');
  }
  return response.json() as Promise<AccountResponse>;
}

export default function LearnerDataSync() {
  const { isLoaded, user } = useUser();
  const app = useApp();
  const [readyUserId, setReadyUserId] = useState('');
  const [syncError, setSyncError] = useState<{ userId: string; message: string } | null>(null);
  const readyUserIdRef = useRef('');
  const userId = user?.id ?? '';

  useEffect(() => {
    let active = true;
    readyUserIdRef.current = '';
    if (!isLoaded || !userId) return () => { active = false; };

    void requestAccount().then(async (account) => {
      if (!active) return;
      if (account.hasExistingData) {
        useApp.setState({
          ...account.appState,
          ...account.settings,
        });
      } else {
        const initialState = useApp.getInitialState();
        useApp.setState(initialState);
        try {
          await requestAccount({ type: 'state', state: initialState });
        } catch (syncError) {
          if (active) setSyncError({
            userId,
            message: syncError instanceof Error ? syncError.message : 'Could not save your learner data.',
          });
        }
      }
      if (active) {
        readyUserIdRef.current = userId;
        setReadyUserId(userId);
        setSyncError(null);
      }
    }).catch((loadError: unknown) => {
      if (active) setSyncError({
        userId,
        message: loadError instanceof Error ? loadError.message : 'Could not load your learner data.',
      });
    });

    return () => { active = false; };
  }, [isLoaded, userId]);

  useEffect(() => {
    if (!userId || readyUserId !== userId || readyUserIdRef.current !== userId) return;
    const timeout = window.setTimeout(() => {
      const state = useApp.getState();
      void requestAccount({ type: 'state', state })
        .then(() => setSyncError(null))
        .catch((syncError: unknown) => {
          setSyncError({
            userId,
            message: syncError instanceof Error ? syncError.message : 'Could not save your learner data.',
          });
        });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [app, readyUserId, userId]);

  if (!syncError || syncError.userId !== userId || !userId) return null;
  return (
    <p role="status" className="fixed bottom-3 left-3 right-3 z-[100] mx-auto max-w-xl rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 shadow-lg">
      Cloud sync unavailable: {syncError.message} Configure MONGODB_URI in .env.local and run the MongoDB setup script.
    </p>
  );
}

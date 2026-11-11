'use client';

import { useUser } from '@clerk/nextjs';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '@/store/useApp';
import { isKnownEducationLevel } from '@/lib/course-access';
import type { Course } from '@/types';

export interface LearnerProfile {
  firstName: string;
  lastName: string;
  email: string;
  contact: string;
  educationLevel: string;
  coins: number;
  xp: number;
  streak: number;
}

interface AccountResponse {
  hasExistingData: boolean;
  profile: LearnerProfile;
  courses: Course[];
  courseProgress: {
    courseId: string;
    currentLessonIndex: number;
    completedLessonIndexes: number[];
    xpEarned: number;
  }[];
  activity: {
    id: string;
    title: string;
    date: string;
    amount: number;
    type: 'lesson' | 'coin';
  }[];
  rewards: {
    id: string;
    title: string;
    description: string;
    cost: number;
    color: string;
    background: string;
  }[];
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

interface LearnerAccountContextValue {
  data: AccountResponse;
  refresh: () => Promise<AccountResponse>;
}

const LearnerAccountContext = createContext<LearnerAccountContextValue | null>(null);

export function useLearnerAccount(): LearnerAccountContextValue {
  const context = useContext(LearnerAccountContext);
  if (!context) throw new Error('useLearnerAccount must be used inside LearnerDataSync.');
  return context;
}

export function useLearnerProfile(): LearnerProfile {
  return useLearnerAccount().data.profile;
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

const DEFAULT_REWARDS = [
  { id: 'reward-study-badge', title: 'Study Badge', description: 'Show off your achievement with a special badge.', cost: 100, color: '#1F63F5', background: '#EAF2FF' },
  { id: 'reward-ebook', title: 'E-Book Voucher', description: 'Get a free e-book from our library.', cost: 250, color: '#7C3AED', background: '#F3EDFF' },
  { id: 'reward-learning-time', title: 'Extra Learning Time', description: 'Get 1 extra day of premium access.', cost: 400, color: '#0FA37F', background: '#E5F8F1' },
  { id: 'reward-gift', title: 'Reward Gift', description: 'A special surprise just for you!', cost: 700, color: '#F2562B', background: '#FFF1E8' },
];

const DEFAULT_SETTINGS: AccountResponse['settings'] = {
  theme: 'navy',
  colorMode: 'light',
  font: 'default',
  scale: '100%',
  wide: false,
  letterSpacing: 'normal',
  lineHeight: 'normal',
  readingTint: 'none',
};

/** Build a safe offline-first data object for a user (or guest). */
function buildOfflineData(opts: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  educationLevel?: unknown;
}): AccountResponse {
  return {
    hasExistingData: false,
    profile: {
      firstName: opts.firstName || 'Learner',
      lastName: opts.lastName || '',
      email: opts.email || '',
      contact: '',
      educationLevel: isKnownEducationLevel(opts.educationLevel) ? opts.educationLevel : 'Not specified',
      coins: 0,
      xp: 0,
      streak: 1,
    },
    courses: [],
    courseProgress: [],
    activity: [],
    rewards: DEFAULT_REWARDS,
    appState: { xp: 0, streak: 1, enrolled: [], done: {}, activeCourse: null },
    settings: DEFAULT_SETTINGS,
  };
}

// Guest-mode data (no user signed in — used during testing / auth-disabled)
const GUEST_DATA: AccountResponse = buildOfflineData({ firstName: 'Guest', lastName: '' });

export default function LearnerDataSync({ children }: { children: ReactNode }) {
  const { isLoaded, user } = useUser();
  const app = useApp();
  const [readyUserId, setReadyUserId] = useState('');
  const [syncError, setSyncError] = useState<{ userId: string; message: string } | null>(null);
  const [accountData, setAccountData] = useState<{ userId: string; data: AccountResponse } | null>(null);
  const readyUserIdRef = useRef('');
  const userId = user?.id ?? '';

  const refresh = useCallback(async (): Promise<AccountResponse> => {
    try {
      const account = await requestAccount();
      setAccountData({ userId, data: account });
      return account;
    } catch {
      if (accountData?.userId === userId && accountData.data) return accountData.data;
      return user
        ? buildOfflineData({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.primaryEmailAddress?.emailAddress,
          educationLevel: user.unsafeMetadata.education,
        })
        : GUEST_DATA;
    }
  }, [userId, accountData, user]);

  useEffect(() => {
    let active = true;
    readyUserIdRef.current = '';

    // ── Guest / no-auth mode (auth disabled for testing) ──
    if (isLoaded && !userId) {
      readyUserIdRef.current = 'guest';
      return () => { active = false; };
    }

    if (!isLoaded || !userId) return () => { active = false; };

    // ── Authenticated mode ──
    void requestAccount().then(async (account) => {
      if (!active) return;
      setAccountData({ userId, data: account });
      if (account.hasExistingData) {
        useApp.setState({ ...account.appState, ...account.settings });
      } else {
        const s = useApp.getState();
        try {
          await requestAccount({
            type: 'state',
            state: {
              theme: s.theme, colorMode: s.colorMode, font: s.font,
              scale: s.scale, wide: s.wide, letterSpacing: s.letterSpacing,
              lineHeight: s.lineHeight, readingTint: s.readingTint, enrolled: s.enrolled,
            },
          });
        } catch (syncErr) {
          if (active) setSyncError({ userId, message: syncErr instanceof Error ? syncErr.message : 'Could not save your learner data.' });
        }
      }
      if (active) {
        readyUserIdRef.current = userId;
        setReadyUserId(userId);
        setSyncError(null);
      }
    }).catch((loadError: unknown) => {
      if (!active) return;
      if (user) {
        setAccountData({
          userId,
          data: buildOfflineData({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.primaryEmailAddress?.emailAddress,
            educationLevel: user.unsafeMetadata.education,
          }),
        });
      }
      readyUserIdRef.current = userId;
      setReadyUserId(userId);
      setSyncError({ userId, message: loadError instanceof Error ? loadError.message : 'Could not load your learner data.' });
    });

    return () => { active = false; };
  }, [isLoaded, userId, user]);

  // Periodic state sync (only for authenticated users)
  useEffect(() => {
    if (!userId || readyUserId !== userId || readyUserIdRef.current !== userId) return;
    const timeout = window.setTimeout(() => {
      const state = useApp.getState();
      void requestAccount({ type: 'state', state })
        .then(() => setSyncError(null))
        .catch((syncErr: unknown) => {
          setSyncError({ userId, message: syncErr instanceof Error ? syncErr.message : 'Could not save your learner data.' });
        });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [app, readyUserId, userId]);

  // ── Determine contextData ──
  // Priority: server-synced → offline fallback → GUEST_DATA
  const contextData: AccountResponse = (() => {
    if (accountData?.userId === userId && accountData.data) {
      return accountData.data;
    }
    if (userId && user) {
      return buildOfflineData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.primaryEmailAddress?.emailAddress,
        educationLevel: user.unsafeMetadata.education,
      });
    }
    return GUEST_DATA;
  })();

  return (
    <LearnerAccountContext.Provider value={{ data: contextData, refresh }}>
      {children}
      {syncError && syncError.userId === userId && userId ? (
        <div role="status" className="fixed bottom-20 left-3 right-3 z-[100] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 shadow-lg backdrop-blur lg:bottom-3">
          <span className="min-w-0 flex-1 truncate">
            {syncError.message.includes('Could not')
              ? 'Working in offline mode (local updates saved). Cloud sync will resume automatically.'
              : `Cloud sync note: ${syncError.message}`}
          </span>
          <button
            type="button"
            onClick={() => setSyncError(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </LearnerAccountContext.Provider>
  );
}

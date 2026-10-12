'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SignOutButton, useUser } from '@clerk/nextjs';
import { Bell, ChevronDown, LogOut, Moon, Search, Sun } from 'lucide-react';
import { useApp } from '@/store/useApp';
import { useLearnerProfile } from './LearnerDataSync';
import { Logo } from './Logo';

export default function Topbar() {
  const { user } = useUser();
  const profile = useLearnerProfile();
  const colorMode = useApp((state) => state.colorMode);
  const setPrefs = useApp((state) => state.setPrefs);
  const placeholder = usePathname() === '/notebook' ? 'Search notes, topics or ask Sautika...' : 'Search courses, topics or ask Sautika...';
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || user?.fullName || 'Learner';
  const email = profile?.email || user?.primaryEmailAddress?.emailAddress || '';
  const initials = fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
  }, [colorMode]);

  return (
    <header className="sticky top-0 z-10 flex min-h-[76px] flex-wrap items-center gap-1 border-b border-line bg-white/90 px-2 py-3 backdrop-blur sm:gap-3 sm:px-4 lg:min-h-[86px] lg:flex-nowrap lg:gap-4 lg:px-10 lg:py-0">
      <a href="/home" aria-label="Sautika home" className="order-1 mr-auto lg:hidden"><Logo dark compact /></a>
      <label className="order-2 relative w-full lg:order-1 lg:max-w-[600px] lg:flex-1">
        <span className="sr-only">Search</span>
        <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-navy" />
        <input type="search" placeholder={placeholder} className="h-[42px] w-full rounded-full bg-[#EDF3FB] pl-12 pr-4 text-[14px] placeholder:text-slate-500 sm:h-[44px] sm:pl-14 sm:text-[15px]" />
      </label>
      <span className="order-2 hidden lg:flex lg:flex-1" />
      <div className="order-1 ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:order-3 lg:ml-0">
        <button
          type="button"
          aria-label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-pressed={colorMode === 'dark'}
          title={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          onClick={() => setPrefs({ colorMode: colorMode === 'light' ? 'dark' : 'light' })}
          className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-slate-100 sm:h-11 sm:w-11"
        >
          {colorMode === 'light'
            ? <Moon className="h-5 w-5 text-navy sm:h-6 sm:w-6" />
            : <Sun className="h-5 w-5 text-navy sm:h-6 sm:w-6" />}
        </button>
        <button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center sm:h-11 sm:w-11"><Bell className="h-5 w-5 text-navy sm:h-6 sm:w-6" /><i className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" /></button>
        <details className="group relative">
          <summary aria-label="Show learner profile" className="flex cursor-pointer list-none items-center gap-1 rounded-full p-1 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-full bg-navy text-sm font-bold text-white sm:h-11 sm:w-11"
              style={user?.imageUrl ? { backgroundImage: `url("${user.imageUrl}")`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
            >
              {user?.imageUrl ? <span className="sr-only">{initials}</span> : initials}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
          </summary>
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-line p-4">
              <span
                aria-hidden="true"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white"
                style={user?.imageUrl ? { backgroundImage: `url("${user.imageUrl}")`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
              >
                {user?.imageUrl ? null : initials}
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[14px] font-semibold text-ink">{fullName}</b>
                <span className="block truncate text-[13px] text-slate-500">{email}</span>
                <span className="mt-1 block text-[11px] font-medium text-slate-500">Profile managed by your administrator</span>
              </span>
            </div>
            <SignOutButton redirectUrl="/">
              <button type="button" className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[14px] font-medium text-slate-600 hover:bg-slate-50">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </SignOutButton>
          </div>
        </details>
      </div>
    </header>
  );
}

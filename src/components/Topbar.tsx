'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SignOutButton, useUser } from '@clerk/nextjs';
import {
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '@/store/useApp';
import { useLearnerProfile } from './LearnerDataSync';
import { Logo } from './Logo';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Sharebility Curriculum Ready',
    message: 'Explore courses from Baby Class to S.6 aggregated from Sharebility Uganda.',
    time: 'Just now',
    read: false,
  },
  {
    id: '2',
    title: 'Daily Streak Bonus Active',
    message: 'Complete any lesson today to keep your learning streak burning and earn +10 XP!',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '3',
    title: 'Rewards Store Open',
    message: 'Use your learner coins to redeem study badges and learning vouchers.',
    time: '1 day ago',
    read: true,
  },
];

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const profile = useLearnerProfile();
  const colorMode = useApp((state) => state.colorMode);
  const setPrefs = useApp((state) => state.setPrefs);
  const sidebarHidden = useApp((state) => state.sidebarHidden);
  const toggleSidebar = useApp((state) => state.toggleSidebar);
  const [searchVal, setSearchVal] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  const placeholder = pathname === '/notebook'
    ? 'Search notes, topics or ask Sautika...'
    : 'Search courses, topics or ask Sautika...';

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || user?.fullName || 'Learner';
  const email = profile?.email || user?.primaryEmailAddress?.emailAddress || '';
  const initials = fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
  }, [colorMode]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    if (pathname === '/notebook') {
      router.push(`/notebook?q=${encodeURIComponent(searchVal.trim())}`);
    } else {
      router.push(`/courses?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-[70px] flex-wrap items-center gap-2 border-b border-line bg-white/95 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-6 lg:min-h-[76px] lg:flex-nowrap lg:gap-4 lg:px-8">
      {/* Mobile Logo */}
      <a href="/home" aria-label="Sautika Study Hub" className="order-1 mr-auto lg:hidden">
        <Logo dark compact />
      </a>

      {/* Desktop Sidebar Toggle Button */}
      <button
        type="button"
        onClick={toggleSidebar}
        title={sidebarHidden ? 'Show navigation bar' : 'Hide navigation bar'}
        aria-label={sidebarHidden ? 'Show navigation bar' : 'Hide navigation bar'}
        className="order-1 hidden lg:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-navy shadow-xs transition hover:bg-slate-50"
      >
        {sidebarHidden ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      {/* Functional Search Bar */}
      <form onSubmit={handleSearchSubmit} className="order-2 relative w-full lg:order-1 lg:max-w-[560px] lg:flex-1">
        <span className="sr-only">Search</span>
        <button
          type="submit"
          aria-label="Submit search"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy"
        >
          <Search className="h-4 w-4" />
        </button>
        <input
          type="search"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-full bg-[#EDF3FB] pl-10 pr-4 text-[13.5px] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-navy sm:h-11 sm:pl-11 sm:text-[14px]"
        />
      </form>

      <span className="order-2 hidden lg:flex lg:flex-1" />

      <div className="order-1 ml-auto flex shrink-0 items-center gap-1 sm:gap-2 lg:order-3 lg:ml-0">
        {/* Dark/Light mode toggle */}
        <button
          type="button"
          aria-label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-pressed={colorMode === 'dark'}
          title={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          onClick={() => setPrefs({ colorMode: colorMode === 'light' ? 'dark' : 'light' })}
          className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-slate-100"
        >
          {colorMode === 'light'
            ? <Moon className="h-5 w-5 text-navy" />
            : <Sun className="h-5 w-5 text-navy" />}
        </button>

        {/* Functional Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-slate-100"
          >
            <Bell className="h-5 w-5 text-navy" />
            {unreadCount > 0 && (
              <span className="absolute right-2 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-line bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 text-[14px] font-bold text-navy">
                  <Sparkles className="h-4 w-4 text-sun" /> Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:underline"
                  >
                    <Check className="h-3 w-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 divide-y divide-line overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`relative p-3.5 transition hover:bg-slate-50 ${
                        !n.read ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <b className="text-[13px] font-bold text-navy">{n.title}</b>
                        <button
                          type="button"
                          aria-label="Dismiss notification"
                          onClick={() => clearNotification(n.id)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-[12px] text-slate-600 leading-snug">{n.message}</p>
                      <span className="mt-1.5 block text-[10.5px] font-medium text-slate-400">{n.time}</span>
                    </div>
                  ))
                ) : (
                  <p className="p-6 text-center text-sm text-slate-500">No new notifications</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Learner Profile Menu */}
        <details className="group relative">
          <summary
            aria-label="Show learner profile"
            className="flex cursor-pointer list-none items-center gap-1 rounded-full p-1 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full bg-navy text-xs sm:text-sm font-bold text-white"
              style={
                user?.imageUrl
                  ? { backgroundImage: `url("${user.imageUrl}")`, backgroundPosition: 'center', backgroundSize: 'cover' }
                  : undefined
              }
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
                style={
                  user?.imageUrl
                    ? { backgroundImage: `url("${user.imageUrl}")`, backgroundPosition: 'center', backgroundSize: 'cover' }
                    : undefined
                }
              >
                {user?.imageUrl ? null : initials}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[14px] font-semibold text-ink">{fullName}</b>
                <span className="block truncate text-[13px] text-slate-500">{email}</span>
                <span className="mt-1 block text-[11px] font-medium text-slate-500">Profile managed by administrator</span>
              </span>
            </div>
            <a
              href="/settings"
              className="flex min-h-11 w-full items-center gap-3 px-4 text-[14px] font-medium text-slate-700 hover:bg-slate-50 border-b border-line"
            >
              Settings &amp; Typography
            </a>
            <SignOutButton redirectUrl="/">
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[14px] font-medium text-slate-600 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </SignOutButton>
          </div>
        </details>
      </div>
    </header>
  );
}

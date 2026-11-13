'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartNoAxesColumn,
  BookOpen,
  CirclePlay,
  LayoutDashboard,
  LogOut,
  NotepadText,
  PanelLeftClose,
  Settings,
  Star,
} from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import { useApp } from '@/store/useApp';
<<<<<<< HEAD:src/components/Sidebar.tsx
import { useUITranslation } from '@/lib/useUITranslation';
import { Logo } from './Logo';
=======
import { Logo } from '@/components/ui/Logo';
>>>>>>> d2f04c65f309218f881d7722604ea00554b5d8d6:src/components/layout/Sidebar.tsx

const NAV = [
  { href: '/home', labelKey: 'Study Hub', icon: LayoutDashboard },
  { href: '/courses', labelKey: 'Courses', icon: BookOpen },
  { href: '/learning', labelKey: 'Learning', icon: CirclePlay },
  { href: '/notebook', labelKey: 'Notebook', icon: NotepadText },
  { href: '/progress', labelKey: 'Progress', icon: ChartNoAxesColumn },
  { href: '/rewards', labelKey: 'Coins & Rewards', icon: Star },
  { href: '/settings', labelKey: 'Settings', icon: Settings },
] as const;

export default function Sidebar() {
  const path = usePathname();
  const sidebarHidden = useApp((state) => state.sidebarHidden);
  const toggleSidebar = useApp((state) => state.toggleSidebar);
  const t = useUITranslation();

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden w-72 flex-col overflow-hidden bg-navy px-4 transition-transform duration-300 lg:flex ${
          sidebarHidden ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-3 pb-5 pt-5">
          <Link href="/home" aria-label="Sautika Study Hub">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            title="Hide navigation bar"
            aria-label="Hide navigation bar"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1.5">
          {NAV.map(({ href, labelKey, icon: Icon }, i) => {
            const on = path.startsWith(href);
            const label = t(labelKey);
            return (
              <div key={href}>
                {path === '/home' && i === 4 && <hr className="mx-3 mb-3 mt-3 border-white/15" />}
                <Link
                  href={href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex h-[50px] min-w-0 items-center gap-4 rounded-xl px-4 text-[16px] font-semibold transition-colors ${
                    on ? 'bg-sun text-navy' : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </Link>
              </div>
            );
          })}
        </nav>
        <svg aria-hidden viewBox="0 0 280 320" className="pointer-events-none absolute -left-4 bottom-24 w-72 opacity-[0.05]" fill="#fff"><path d="M20 300C-10 200 40 80 130 40c30 90 10 210-110 260z" /><path d="M150 220c20-80 80-130 140-140-5 80-50 150-140 160z" /><path d="M60 320c30-60 90-100 160-110-10 70-60 110-160 110z" /></svg>
        <SignOutButton redirectUrl="/">
          <button type="button" className="relative mt-auto mb-6 flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-white/10">
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{t('Sign out')}</span>
          </button>
        </SignOutButton>
      </aside>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid min-h-16 grid-cols-7 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ href, labelKey, icon: Icon }) => {
          // Short labels for mobile
          const shortLabel = labelKey === 'Coins & Rewards' ? t('Rewards') : labelKey === 'Notebook' ? t('Notes') : t(labelKey);
          return (
            <Link
              key={href}
              href={href}
              aria-label={t(labelKey)}
              aria-current={path.startsWith(href) ? 'page' : undefined}
              className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-slate-500 aria-[current=page]:bg-sun aria-[current=page]:text-navy"
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate text-[9px] font-semibold leading-tight min-[380px]:text-[10px]">
                {shortLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartNoAxesColumn, BookOpen, CirclePlay, LayoutDashboard, LogOut, NotepadText, Settings, Star } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import { Logo } from './Logo';

const NAV = [
  { href: '/home', label: 'Study Hub', icon: LayoutDashboard }, { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/learning', label: 'Learning', icon: CirclePlay }, { href: '/notebook', label: 'Notebook', icon: NotepadText },
  { href: '/progress', label: 'Progress', icon: ChartNoAxesColumn }, { href: '/rewards', label: 'Coins & Rewards', icon: Star },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col overflow-hidden bg-navy px-4 lg:flex">
        <div className="px-3 pb-6 pt-5"><Link href="/home" aria-label="Sautika Study Hub"><Logo /></Link></div>
        <nav aria-label="Main" className="flex flex-col gap-1.5">
          {NAV.map(({ href, label, icon: Icon }, i) => {
            const on = path.startsWith(href);
            return (
              <div key={href}>
                {path === '/home' && i === 4 && <hr className="mx-3 mb-3 mt-3 border-white/15" />}
                <Link href={href} aria-current={on ? 'page' : undefined} className={`flex h-[50px] items-center gap-4 rounded-xl px-4 text-[17px] font-semibold ${on ? 'bg-sun text-navy' : 'text-white hover:bg-white/10'}`}>
                  <Icon className="h-6 w-6" strokeWidth={1.8} />{label}
                </Link>
              </div>
            );
          })}
        </nav>
        <svg aria-hidden viewBox="0 0 280 320" className="pointer-events-none absolute -left-4 bottom-24 w-72 opacity-[0.05]" fill="#fff"><path d="M20 300C-10 200 40 80 130 40c30 90 10 210-110 260z" /><path d="M150 220c20-80 80-130 140-140-5 80-50 150-140 160z" /><path d="M60 320c30-60 90-100 160-110-10 70-60 110-160 110z" /></svg>
        <SignOutButton redirectUrl="/">
          <button type="button" className="relative mt-auto mb-6 flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-white/10">
            <LogOut className="h-5 w-5" strokeWidth={2} />
            Sign out
          </button>
        </SignOutButton>
      </aside>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid min-h-16 grid-cols-7 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-label={label} aria-current={path.startsWith(href) ? 'page' : undefined} className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-slate-500 aria-[current=page]:bg-sun aria-[current=page]:text-navy">
            <Icon className="h-5 w-5 shrink-0" />
            <span className="max-w-full truncate text-[9px] font-semibold leading-tight min-[400px]:text-[10px]">{label === 'Coins & Rewards' ? 'Rewards' : label === 'Notebook' ? 'Notes' : label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

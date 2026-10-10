'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Bell, ChevronDown, Moon, Search, Sun } from 'lucide-react';
import { USER } from '@/lib/data';
import { useApp } from '@/store/useApp';
import { Logo } from './Logo';

export default function Topbar() {
  const colorMode = useApp((state) => state.colorMode);
  const setPrefs = useApp((state) => state.setPrefs);
  const placeholder = usePathname() === '/notebook' ? 'Search notes, topics or ask Sautika...' : 'Search courses, topics or ask Sautika...';

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
        <button className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label="Account menu">
          <Image src="/images/aisha.jpg" alt="" width={54} height={54} className="h-10 w-10 rounded-full object-cover sm:h-[54px] sm:w-[54px]" />
          <span className="hidden text-left leading-tight sm:block"><b className="block text-[15px]">{USER.name}</b><span className="text-[14px] text-slate-500">{USER.grade}</span></span>
          <ChevronDown className="hidden h-5 w-5 text-navy sm:block" />
        </button>
      </div>
    </header>
  );
}

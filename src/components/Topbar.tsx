'use client';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Bell, ChevronDown, Search } from 'lucide-react';
import { USER } from '@/lib/data';

export default function Topbar() {
  const placeholder = usePathname() === '/notebook' ? 'Search notes, topics or ask Sautika...' : 'Search courses, topics or ask Sautika...';
  return (
    <header className="sticky top-0 z-10 flex min-h-[76px] flex-wrap items-center gap-3 border-b border-line bg-white/90 px-3 py-3 backdrop-blur sm:px-4 lg:min-h-[86px] lg:flex-nowrap lg:gap-4 lg:px-10 lg:py-0">
      <label className="order-2 relative w-full lg:order-1 lg:max-w-[600px] lg:flex-1">
        <span className="sr-only">Search</span>
        <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-navy" />
        <input type="search" placeholder={placeholder} className="h-[42px] w-full rounded-full bg-[#EDF3FB] pl-12 pr-4 text-[14px] placeholder:text-slate-500 sm:h-[44px] sm:pl-14 sm:text-[15px]" />
      </label>
      <span className="order-1 hidden lg:flex lg:flex-1" />
      <button aria-label="Notifications" className="order-1 relative grid h-10 w-10 place-items-center sm:h-11 sm:w-11"><Bell className="h-5 w-5 text-navy sm:h-6 sm:w-6" /><i className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" /></button>
      <button className="order-1 flex min-w-0 items-center gap-2 sm:gap-3" aria-label="Account menu">
        <Image src="/images/aisha.jpg" alt="" width={54} height={54} className="h-10 w-10 rounded-full object-cover sm:h-[54px] sm:w-[54px]" />
        <span className="hidden text-left leading-tight sm:block"><b className="block text-[15px]">{USER.name}</b><span className="text-[14px] text-slate-500">{USER.grade}</span></span>
        <ChevronDown className="hidden h-5 w-5 text-navy sm:block" />
      </button>
    </header>
  );
}

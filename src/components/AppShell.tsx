'use client';

import { useApp } from '@/store/useApp';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarHidden = useApp((state) => state.sidebarHidden);

  return (
    <div className={`min-h-screen transition-[padding] duration-300 ${sidebarHidden ? 'lg:pl-0' : 'lg:pl-72'}`}>
      <Sidebar />
      <Topbar />
      <main className="min-w-0 px-3.5 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">{children}</main>
    </div>
  );
}


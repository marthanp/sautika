'use client';

import { useApp } from '@/store/useApp';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AmbientLanguageCanvas from '@/components/voice/AmbientLanguageCanvas';
import FloatingDialectSelector from '@/components/voice/FloatingDialectSelector';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarHidden = useApp((state) => state.sidebarHidden);

  return (
    <div className={`relative min-h-screen transition-[padding] duration-300 ${sidebarHidden ? 'lg:pl-0' : 'lg:pl-72'}`}>
      <AmbientLanguageCanvas />
      <Sidebar />
      <Topbar />
      <main className="min-w-0 px-3.5 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">{children}</main>
      <FloatingDialectSelector />
    </div>
  );
}


'use client';

import { useApp } from '@/store/useApp';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import FloatingDialectSelector from '@/components/voice/FloatingDialectSelector';
import PageAudioReader from '@/components/voice/PageAudioReader';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarHidden = useApp((state) => state.sidebarHidden);

  return (
    <div className={`relative min-h-screen transition-[padding] duration-300 ${sidebarHidden ? 'lg:pl-0' : 'lg:pl-72'}`}>
      <Sidebar />
      <Topbar />

      {/* Sticky top-right listen feature below the main top navigation bar */}
      <div className="sticky top-[70px] z-20 pointer-events-none px-3.5 sm:px-6 lg:top-[76px] lg:px-8">
        <div className="mx-auto flex max-w-[1330px] justify-end pt-2 pb-1">
          <div className="pointer-events-auto">
            <PageAudioReader />
          </div>
        </div>
      </div>

      <main className="min-w-0 px-3.5 pb-24 pt-1 sm:px-6 sm:pt-2 lg:px-8 lg:pb-10">{children}</main>
      <FloatingDialectSelector />
    </div>
  );
}


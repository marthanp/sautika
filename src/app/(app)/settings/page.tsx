'use client';

import { Settings } from 'lucide-react';
import SettingsPanel from './SettingsPanel';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sun/20 text-navy">
            <Settings aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">Settings</h1>
            <p className="text-xs leading-normal text-slate-500 sm:text-sm">Manage your account, preferences, and learning experience.</p>
          </div>
        </div>
      </div>
      <SettingsPanel />
    </div>
  );
}

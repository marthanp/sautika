'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Globe, ChevronDown, Check, Volume2, Languages, X, Search } from 'lucide-react';
import { useApp } from '@/store/useApp';
import { SUNBIRD_LANGUAGES, hasSunbirdTts, type VoiceLang } from '@/lib/sunbird-languages';
import { triggerFeedback } from '@/lib/feedback';

// Primary East African dialects pinned for 1-click access
const PINNED_DIALECTS: { code: VoiceLang; name: string; nativeName: string; region: string }[] = [
  { code: 'lug', name: 'Luganda', nativeName: 'Oluganda', region: 'Uganda' },
  { code: 'swa', name: 'Swahili', nativeName: 'Kiswahili', region: 'East Africa' },
  { code: 'ach', name: 'Acholi', nativeName: 'Leb Acoli', region: 'N. Uganda' },
  { code: 'teo', name: 'Ateso', nativeName: 'Ateso', region: 'E. Uganda' },
  { code: 'nyn', name: 'Runyankole', nativeName: 'Nkore', region: 'W. Uganda' },
  { code: 'luo', name: 'Dholuo', nativeName: 'Luo', region: 'E. Africa' },
  { code: 'kik', name: 'Kikuyu', nativeName: 'Gĩkũyũ', region: 'Kenya' },
  { code: 'kin', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', region: 'Rwanda/Uganda' },
  { code: 'eng', name: 'English', nativeName: 'English', region: 'Official' },
];

export default function FloatingDialectSelector({ className = '' }: { className?: string }) {
  const activeDialect = useApp((state) => state.activeDialect || 'lug');
  const setActiveDialect = useApp((state) => state.setActiveDialect);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeInfo = useMemo(() => {
    return (
      PINNED_DIALECTS.find((d) => d.code === activeDialect) ||
      SUNBIRD_LANGUAGES.find((d) => d.code === activeDialect) || {
        code: activeDialect,
        name: activeDialect,
        nativeName: activeDialect,
        region: 'Regional',
      }
    );
  }, [activeDialect]);

  const hasVoice = hasSunbirdTts(activeDialect);

  // Filter full list when searching
  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return SUNBIRD_LANGUAGES;
    const q = search.toLowerCase();
    return SUNBIRD_LANGUAGES.filter(
      (lang) => lang.name.toLowerCase().includes(q) || lang.code.toLowerCase().includes(q),
    );
  }, [search]);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code: VoiceLang): void => {
    triggerFeedback('chip');
    setActiveDialect(code);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <aside
      ref={containerRef}
      aria-label="Quick Dialect Switcher"
      className={`fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6 ${className}`}
    >
      {/* Floating Pill Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Active dialect: ${activeInfo.name}. Click to switch language.`}
        className="group relative flex items-center gap-2.5 rounded-full border border-slate-300/80 bg-white/95 px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-[0_8px_30px_rgba(0,23,49,0.12)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-sun hover:shadow-[0_10px_35px_rgba(255,196,0,0.25)] active:scale-95 dark:border-white/15 dark:bg-navy-2/95 dark:text-slate-100"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun/20 text-sun">
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold tracking-tight text-ink dark:text-white">{activeInfo.name}</span>
          {hasVoice ? (
            <span
              title="Sunbird voice playback supported"
              className="flex items-center text-[10px] text-emerald-600 dark:text-emerald-400"
            >
              <Volume2 className="h-3 w-3" aria-hidden="true" />
            </span>
          ) : (
            <span
              title="Translation text supported"
              className="text-[10px] text-slate-400"
            >
              📝
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-sun' : 'group-hover:translate-y-0.5'
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Spring Animated Dialect Selection Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Choose Learning Dialect"
          className="absolute bottom-full right-0 mb-3 w-[340px] max-w-[calc(100vw-32px)] overflow-hidden rounded-3xl border border-slate-200/90 bg-white/98 p-4 shadow-[0_20px_50px_rgba(0,23,49,0.25)] backdrop-blur-xl animate-kinetic-entry dark:border-white/15 dark:bg-navy/98 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-sun text-navy font-bold text-xs">
                <Languages className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Active Dialect</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Native African speech & translation</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close dialect selector"
              className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 48 African languages…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-sun focus:bg-white focus:outline-none dark:border-white/10 dark:bg-navy-2 dark:text-white"
            />
          </div>

          {/* Pinned East African Dialects Quick Grid */}
          {!search.trim() && (
            <div className="mt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                East Africa Quick Switch
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {PINNED_DIALECTS.map((dialect) => {
                  const isSelected = activeDialect === dialect.code;
                  return (
                    <button
                      key={dialect.code}
                      type="button"
                      onClick={() => handleSelect(dialect.code)}
                      className={`flex flex-col items-start rounded-xl p-2 text-left transition-all duration-200 ${
                        isSelected
                          ? 'bg-sun text-navy font-bold shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-navy-2/60 dark:text-slate-200 dark:hover:bg-navy-2'
                      }`}
                    >
                      <span className="truncate text-xs font-bold leading-tight">{dialect.name}</span>
                      <span
                        className={`truncate text-[9.5px] ${
                          isSelected ? 'text-navy/80' : 'text-slate-400 dark:text-slate-400'
                        }`}
                      >
                        {dialect.nativeName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Languages Scrollable List */}
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {search.trim() ? `Search Results (${filteredLanguages.length})` : 'All Sunbird Languages'}
            </p>
            <div className="max-h-44 overflow-y-auto space-y-1 pr-1 scrollbar-none">
              {filteredLanguages.map((lang) => {
                const isSelected = activeDialect === lang.code;
                const supportsVoice = hasSunbirdTts(lang.code as VoiceLang);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang.code as VoiceLang)}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition ${
                      isSelected
                        ? 'bg-sun/20 text-navy font-bold dark:text-sun'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.name}</span>
                      {supportsVoice ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <Volume2 className="h-2.5 w-2.5" /> Voice
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
                          Text
                        </span>
                      )}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-sun" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}


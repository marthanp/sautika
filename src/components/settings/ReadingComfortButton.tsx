'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import ReadingComfort from '@/components/settings/ReadingComfort';
import { useApp } from '@/store/useApp';
import { useUITranslation } from '@/lib/useUITranslation';

/**
 * The "Aa" button in the top bar.
 *
 * Reading comfort is the difference between a usable page and an unusable one
 * for a learner with dyslexia, so it belongs one tap away on every screen
 * rather than several taps into settings.
 */
export default function ReadingComfortButton() {
  const t = useUITranslation();
  const [open, setOpen] = useState(false);
  const dyslexiaMode = useApp((s) => s.dyslexiaMode);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
        // Focus goes back where it came from, not to the top of the page.
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (
        panelRef.current &&
        event.target instanceof Node &&
        !panelRef.current.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={t('Reading comfort')}
        aria-expanded={open}
        title={t('Reading comfort')}
        onClick={() => setOpen((current) => !current)}
        className={`grid h-10 w-10 place-items-center rounded-full text-[15px] font-extrabold transition-colors hover:bg-slate-100 ${
          dyslexiaMode ? 'bg-sun text-navy' : 'text-navy'
        }`}
      >
        Aa
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('Reading comfort')}
          className="fixed left-3 right-3 top-[76px] z-50 max-h-[75vh] overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[380px]"
        >
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-[16px] font-extrabold text-navy">{t('Reading comfort')}</h2>
            <button
              type="button"
              aria-label={t('Close')}
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-mist"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <ReadingComfort />
        </div>
      ) : null}
    </div>
  );
}

'use client';

import React from 'react';
import { Sparkles, X, ChevronRight } from 'lucide-react';
import { triggerFeedback } from '@/lib/feedback';

export interface QuickPrompt {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  action: () => void;
}

interface QuickPromptChipsProps {
  prompts: QuickPrompt[];
  title?: string;
  onDismiss?: () => void;
  className?: string;
}

export default function QuickPromptChips({
  prompts,
  title = 'Suggested actions',
  onDismiss,
  className = '',
}: QuickPromptChipsProps) {
  if (!prompts || prompts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Suggested quick actions"
      className={`animate-kinetic-entry w-full transition-all duration-300 ${className}`}
    >
      <div className="flex items-center justify-between px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 text-sun">
          <Sparkles className="h-3 w-3" />
          <span>{title}</span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={() => {
              triggerFeedback('chip');
              onDismiss();
            }}
            aria-label="Dismiss quick prompts"
            className="flex items-center gap-1 text-[10px] lowercase text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <span>hide</span>
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Swipeable horizontal chip row */}
      <div className="relative flex items-center">
        <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto py-1.5 text-xs">
          {prompts.map((prompt, idx) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => {
                triggerFeedback('chip');
                prompt.action();
              }}
              className={`animate-kinetic-entry stagger-${Math.min(idx + 1, 5)} group flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 font-medium text-slate-800 shadow-xs backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-sun/60 hover:bg-amber-50/50 hover:shadow-sm active:scale-95 dark:border-white/15 dark:bg-navy-2/90 dark:text-slate-200 dark:hover:border-sun/60 dark:hover:bg-amber-950/20`}
            >
              {prompt.icon && (
                <span className="text-sun transition-transform duration-200 group-hover:scale-110">
                  {prompt.icon}
                </span>
              )}
              <span className="whitespace-nowrap">{prompt.label}</span>
              {prompt.sublabel && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {prompt.sublabel}
                </span>
              )}
              <ChevronRight className="h-3 w-3 text-slate-400 opacity-60 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


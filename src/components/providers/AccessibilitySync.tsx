'use client';
import { useEffect } from 'react';
import { useApp } from '@/store/useApp';

/**
 * Pushes the reading preferences onto `<html>` as data attributes, which is
 * where `globals.css` picks them up. Keeping it in one place means a new
 * preference needs one line here and one rule there, rather than props
 * threaded through the tree.
 */
export default function AccessibilitySync() {
  const colorMode = useApp((s) => s.colorMode);
  const font = useApp((s) => s.font);
  const scale = useApp((s) => s.scale);
  const letterSpacing = useApp((s) => s.letterSpacing);
  const lineHeight = useApp((s) => s.lineHeight);
  const readingTint = useApp((s) => s.readingTint);
  const wide = useApp((s) => s.wide);
  const dyslexiaMode = useApp((s) => s.dyslexiaMode);
  const readingRuler = useApp((s) => s.readingRuler);
  const focusMode = useApp((s) => s.focusMode);
  const boldWordStarts = useApp((s) => s.boldWordStarts);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.colorMode = colorMode || 'light';
    root.dataset.font = font || 'default';
    root.dataset.letterSpacing = letterSpacing || (wide ? 'wide' : 'normal');
    root.dataset.lineHeight = lineHeight || 'normal';
    root.dataset.readingTint = readingTint || 'none';
    root.dataset.reading = dyslexiaMode ? 'comfort' : 'normal';
    root.dataset.focusMode = focusMode ? 'on' : 'off';
    root.dataset.boldWordStarts = boldWordStarts ? 'on' : 'off';

    if (scale && scale !== '100%') {
      root.style.fontSize = scale;
    } else {
      root.style.fontSize = '';
    }
  }, [
    colorMode,
    font,
    scale,
    letterSpacing,
    lineHeight,
    readingTint,
    wide,
    dyslexiaMode,
    focusMode,
    boldWordStarts,
  ]);

  // The reading ruler follows the pointer or the keyboard caret, so it is
  // driven here rather than by a React re-render per mouse move.
  useEffect(() => {
    if (!readingRuler) {
      document.documentElement.dataset.readingRuler = 'off';
      return;
    }
    document.documentElement.dataset.readingRuler = 'on';

    let frame = 0;
    const move = (y: number): void => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        document.documentElement.style.setProperty('--ruler-y', `${y}px`);
      });
    };

    const onPointer = (event: PointerEvent): void => move(event.clientY);
    const onFocus = (event: FocusEvent): void => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const box = target.getBoundingClientRect();
        move(box.top + box.height / 2);
      }
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('focusin', onFocus);
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('focusin', onFocus);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.dataset.readingRuler = 'off';
    };
  }, [readingRuler]);

  return null;
}

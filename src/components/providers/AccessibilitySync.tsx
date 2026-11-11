'use client';
import { useEffect } from 'react';
import { useApp } from '@/store/useApp';

export default function AccessibilitySync() {
  const colorMode = useApp((s) => s.colorMode);
  const font = useApp((s) => s.font);
  const scale = useApp((s) => s.scale);
  const letterSpacing = useApp((s) => s.letterSpacing);
  const lineHeight = useApp((s) => s.lineHeight);
  const readingTint = useApp((s) => s.readingTint);
  const wide = useApp((s) => s.wide);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.colorMode = colorMode || 'light';
    root.dataset.font = font || 'default';
    root.dataset.letterSpacing = letterSpacing || (wide ? 'wide' : 'normal');
    root.dataset.lineHeight = lineHeight || 'normal';
    root.dataset.readingTint = readingTint || 'none';
    if (scale && scale !== '100%') {
      root.style.fontSize = scale;
    } else {
      root.style.fontSize = '';
    }
  }, [colorMode, font, scale, letterSpacing, lineHeight, readingTint, wide]);

  return null;
}

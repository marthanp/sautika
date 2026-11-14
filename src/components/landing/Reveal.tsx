'use client';

import { useCallback, useRef, useState, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Render as a div (default), li or section so lists stay valid. */
  as?: 'div' | 'li' | 'section';
  className?: string;
  /** Stagger this item behind its siblings, in milliseconds. */
  delay?: number;
}

/**
 * Fades its children in the first time they scroll into view, then stops
 * observing. Where IntersectionObserver is missing the content is simply
 * visible from the start.
 */
export default function Reveal({ children, as = 'div', className = '', delay = 0 }: RevealProps) {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // A ref callback runs only in the browser, so the server markup stays hidden
  // and hydration matches even where IntersectionObserver is missing.
  const attach = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  const Tag = as as ElementType;
  return (
    <Tag
      ref={attach}
      className={`reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

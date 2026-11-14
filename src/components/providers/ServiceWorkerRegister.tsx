'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

/**
 * Registers the service worker in production, and clears the cached pages when
 * a learner signs out, so the next person on a shared phone cannot page back
 * through someone else's lessons.
 */
export default function ServiceWorkerRegister() {
  const { isSignedIn } = useAuth();
  const wasSignedIn = useRef(isSignedIn);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      void navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
        console.warn('Service worker registration failed:', error);
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  useEffect(() => {
    const signedOut = wasSignedIn.current === true && isSignedIn === false;
    wasSignedIn.current = isSignedIn;
    if (!signedOut) return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.ready
      .then((registration) => registration.active?.postMessage('sautika:clear-pages'))
      .catch(() => {
        // Nothing to clear if no worker ever took control.
      });
  }, [isSignedIn]);

  return null;
}

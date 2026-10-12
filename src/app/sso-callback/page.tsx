'use client';

import { HandleSSOCallback } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function SSOCallbackPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-5 text-center text-sm text-slate-600">
      <HandleSSOCallback
        navigateToApp={({ decorateUrl }) => {
          const destination = decorateUrl('/home');
          if (destination.startsWith('http')) {
            window.location.href = destination;
          } else {
            router.replace(destination);
          }
        }}
        navigateToSignIn={() => router.replace('/sign-in')}
        navigateToSignUp={() => router.replace('/register')}
      />
      Completing your sign-in…
    </main>
  );
}

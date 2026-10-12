'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClerk, useSignIn, useUser } from '@clerk/nextjs';
import { useState, type FormEvent } from 'react';
import { ArrowRight, LogOut } from 'lucide-react';
import { GoogleG, Logo } from './Icons';

export default function SignIn() {
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [requiresAdditionalVerification, setRequiresAdditionalVerification] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isSubmitting = fetchStatus === 'fetching';

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setRequiresAdditionalVerification(false);

    try {
      const { error: signInError } = await signIn.password({
        emailAddress: email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (signIn.status !== 'complete') {
        setRequiresAdditionalVerification(true);
        setError('Additional verification is required. Continue using the sign-in page to finish.');
        return;
      }

      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) {
        setError(finalizeError.message);
        return;
      }

      router.replace('/home');
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Sign in failed. Please try again.');
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setError('');
    try {
      await signOut();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');

    try {
      // If user is already logged in, sign them out first before starting Google OAuth
      if (isSignedIn) {
        await signOut();
      }

      const { error: signInError } = await signIn.sso({
        strategy: 'oauth_google',
        redirectUrl: '/home',
        redirectCallbackUrl: '/sso-callback',
      });

      if (signInError) setError(signInError.message);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Google sign in failed. Please try again.');
    }
  }

  return (
    <section id="signin" className="flex min-h-screen items-center justify-center bg-mist px-4 py-6 sm:px-6">
      <div className="w-full max-w-[980px] rounded-[22px] bg-white px-6 py-8 shadow-[0_10px_40px_rgba(15,40,80,0.08)] sm:px-12 sm:py-10">
          <div className="flex justify-center"><Logo dark size="lg" center /></div>
          <h2 className="mt-8 text-center font-display text-[26px] font-semibold tracking-tight">Welcome to Sautika!</h2>
          <p className="mt-3 text-center text-[15px] leading-relaxed text-slate-500">Learn in your language and grow your confidence, one lesson at a time.</p>

          {isSignedIn && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row">
              <div className="text-left">
                <p className="text-[13px] font-semibold text-amber-900">
                  You are currently signed in {user?.primaryEmailAddress?.emailAddress ? `as ${user.primaryEmailAddress.emailAddress}` : ''}
                </p>
                <p className="text-[12px] text-amber-700">
                  To sign in with a different account or Google, sign out first.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-800 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-900 disabled:opacity-60"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isSigningOut ? 'Signing out…' : 'Sign out now'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isSigningOut}
            className="mt-8 flex min-h-[60px] w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-[16px] font-semibold text-ink shadow-sm transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleG className="h-5 w-5" />
            Continue with Google
          </button>
          <div className="my-6 flex items-center gap-4 text-[13px] font-medium uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or continue with email
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          {error ? (
            <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <span>
                {error}{' '}
                {requiresAdditionalVerification ? (
                  <Link href="/sign-in" className="font-semibold underline">Continue</Link>
                ) : null}
              </span>
              {error.toLowerCase().includes('already signed in') && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="shrink-0 font-semibold underline hover:text-red-900"
                >
                  Sign out
                </button>
              )}
            </div>
          ) : null}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <label className="block text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-[16px] font-normal text-ink outline-none placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/15"
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="block text-[13px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-5 text-[16px] font-normal text-ink outline-none placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/15"
                placeholder="Enter your password"
                required
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl bg-navy px-4 text-[16px] font-semibold text-white shadow-sm transition-colors hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-7 text-center text-[14px] text-blue-900/70">
            New to Sautika?{' '}
            <Link href="/register" className="inline-flex items-center gap-1 font-semibold text-sun-dark hover:underline">
              Create an Account <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
      </div>
    </section>
  );
}

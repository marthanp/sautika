'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClerk, useSignIn, useUser } from '@clerk/nextjs';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LogOut, ShieldCheck } from 'lucide-react';
import { GoogleG, Logo } from './Icons';

export default function SignIn() {
  const { signOut } = useClerk();
  const { isSignedIn, user } = useUser();
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        emailAddress: email.trim(),
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

      window.location.href = '/home';
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
    <section id="signin" className="relative flex items-center justify-center px-4 py-16 sm:py-20 bg-gradient-to-b from-mist via-white to-mist">
      {/* Decorative subtle backdrop elements */}
      <div className="pointer-events-none absolute -top-12 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-sun/10 blur-3xl" />

      <div className="w-full max-w-[460px] rounded-3xl border border-slate-200/80 bg-white p-7 sm:p-9 shadow-[0_16px_50px_rgba(15,35,70,0.07)] transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Logo dark size="md" center />
          <h2 className="mt-4 font-display text-[22px] font-bold tracking-tight text-navy sm:text-[24px]">
            Welcome to Sautika
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            Learn in your language and build your future.
          </p>
        </div>

        {/* Signed In Banner */}
        {isSignedIn && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-3.5 py-2.5 text-[12px] text-amber-900">
            <span className="truncate">
              Signed in as <b>{user?.primaryEmailAddress?.emailAddress || 'active learner'}</b>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-800 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-amber-900 disabled:opacity-60"
            >
              <LogOut className="h-3 w-3" />
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        )}

        {/* Google SSO Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting || isSigningOut}
          className="mt-6 flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-[13.5px] font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleG className="h-4 w-4 shrink-0" />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or continue with email
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Error Alert */}
        {error ? (
          <div role="alert" className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2 text-[12px] text-red-700">
            <span className="leading-tight">
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
                className="shrink-0 text-[11px] font-bold underline hover:text-red-900"
              >
                Sign out
              </button>
            )}
          </div>
        ) : null}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Password
              </label>
            </div>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-3.5 pr-10 text-[13.5px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-navy-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              'Signing in…'
            ) : (
              <>
                Sign In <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <p className="text-[13px] text-slate-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-semibold text-navy transition-colors hover:text-sun-dark hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

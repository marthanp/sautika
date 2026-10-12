'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSignIn } from '@clerk/nextjs';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Lock, Smartphone, Wifi, type LucideIcon } from 'lucide-react';
import { GoogleG, Logo } from './Icons';

const BADGES: { icon: LucideIcon; a: string; b: string }[] = [
  { icon: Lock, a: 'Secure', b: '& Private' }, { icon: Wifi, a: 'Offline', b: 'Ready' }, { icon: Smartphone, a: 'Works on', b: 'Any Device' },
];

export default function SignIn() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [requiresAdditionalVerification, setRequiresAdditionalVerification] = useState(false);
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

  async function handleGoogleSignIn() {
    setError('');

    try {
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
    <section id="signin" className="bg-mist px-5 py-12 sm:px-8 md:py-16">
      <div className="mx-auto grid max-w-[1100px] items-center gap-10 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="w-full rounded-2xl bg-white p-6 shadow-[0_10px_40px_rgba(15,40,80,0.08)] sm:p-8">
          <div className="flex justify-center"><Logo dark size="lg" center /></div>
          <h2 className="mt-8 text-center font-display text-[21px] font-semibold tracking-tight">Welcome to Sautika!</h2>
          <p className="mt-2 text-center text-[13px] leading-relaxed text-slate-500">Learn in your language and grow your confidence, one lesson at a time.</p>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-[14px] font-semibold text-ink shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleG className="h-5 w-5" />
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or continue with email
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          {error ? (
            <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error}{' '}
              {requiresAdditionalVerification ? (
                <Link href="/sign-in" className="font-semibold underline">Continue</Link>
              ) : null}
            </p>
          ) : null}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-[14px] font-normal text-ink outline-none placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/15"
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-[14px] font-normal text-ink outline-none placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/15"
                placeholder="Enter your password"
                required
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-5 text-center text-[11.5px] text-blue-900/70">
            New to Sautika?{' '}
            <Link href="/register" className="inline-flex items-center gap-1 font-semibold text-sun-dark hover:underline">
              Create an Account <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>

        <div className="relative hidden min-h-[360px] overflow-hidden rounded-3xl bg-blob lg:flex lg:items-center">
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-72 w-72 rounded-full border border-sun/20" />
          <div aria-hidden="true" className="absolute -right-8 -top-12 h-56 w-56 rounded-full border border-sun/20" />
          <div className="relative z-10 max-w-[350px] py-9 pl-9 pr-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-sun-dark">Your learning journey</p>
            <h2 className="font-display text-[26px] font-semibold leading-[1.15] tracking-tight">One account.<br />Endless possibilities.</h2>
            <p className="mt-3 max-w-[310px] text-[13px] leading-[1.7] text-slate-600">Access your lessons, track progress, earn rewards, and build a brighter future. All in one place.</p>
            <ul className="mt-6 flex gap-3">
              {BADGES.map(({ icon: Icon, a, b }) => (
                <li key={a} className="flex min-h-[96px] w-[78px] flex-col items-center justify-center rounded-2xl border border-white/80 bg-white/90 px-1.5 py-3 text-center text-[10.5px] font-medium leading-tight text-ink shadow-sm">
                  <Icon className="mb-2 h-[22px] w-[22px] text-blue-900" strokeWidth={1.6} />{a}<br />{b}
                </li>
              ))}
            </ul>
          </div>
          <Image src="/images/boy.jpg" alt="A smiling student with a backpack looking up" width={230} height={320} sizes="230px"
            className="absolute bottom-0 right-0 z-0 hidden h-[320px] w-[230px] object-cover object-top [mask-image:linear-gradient(to_right,transparent,#000_16%)] xl:block" />
        </div>
      </div>
    </section>
  );
}

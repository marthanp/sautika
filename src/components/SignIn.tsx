'use client';
import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Smartphone, Wifi, type LucideIcon } from 'lucide-react';
import { continueWithGoogle, signIn } from '@/lib/auth';
import { GoogleG, Logo } from './Icons';

const BADGES: { icon: LucideIcon; a: string; b: string }[] = [
  { icon: Lock, a: 'Secure', b: '& Private' }, { icon: Wifi, a: 'Offline', b: 'Ready' }, { icon: Smartphone, a: 'Works on', b: 'Any Device' },
];

export default function SignIn() {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    signIn();
  }

  return (
    <section id="signin" className="bg-mist px-5 py-12 sm:px-8 md:py-16">
      <div className="mx-auto grid max-w-[1100px] items-center gap-10 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="w-full rounded-2xl bg-white p-6 shadow-[0_10px_40px_rgba(15,40,80,0.08)] sm:p-8">
          <div className="flex justify-center"><Logo dark size="lg" center /></div>
          <h2 className="mt-8 text-center font-display text-[21px] font-semibold tracking-tight">Welcome to Sautika!</h2>
          <p className="mt-2 text-center text-[13px] leading-relaxed text-slate-500">Learn in your language and grow your confidence, one lesson at a time.</p>
          <button type="button" onClick={continueWithGoogle} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-[14px] font-semibold text-ink transition-colors hover:border-slate-400 hover:bg-slate-50">
            <GoogleG className="h-[18px] w-[18px]" /> Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-[11px] font-medium text-slate-400">
            <hr className="flex-1 border-slate-200" />or continue with email<hr className="flex-1 border-slate-200" />
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
              Email address
              <input
                autoComplete="email"
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[14px] font-normal normal-case tracking-normal text-ink outline-none placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/15"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </label>
            <div>
              <label htmlFor="signin-password" className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
              Password
              </label>
              <div className="relative mt-2">
                <input
                  id="signin-password"
                  autoComplete={isCreatingAccount ? 'new-password' : 'current-password'}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-[14px] font-normal normal-case tracking-normal text-ink outline-none placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/15"
                  minLength={8}
                  name="password"
                  placeholder="At least 8 characters"
                  required
                  type={isPasswordVisible ? 'text' : 'password'}
                />
                <button
                  type="button"
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                  aria-pressed={isPasswordVisible}
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink focus-visible:outline-navy"
                >
                  {isPasswordVisible
                    ? <EyeOff aria-hidden="true" className="h-[18px] w-[18px]" />
                    : <Eye aria-hidden="true" className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>
            <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-navy-2">
              {isCreatingAccount ? 'Create Account' : 'Sign In'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-5 text-center text-[11.5px] text-blue-900/70">
            {isCreatingAccount ? 'Already have an account?' : 'New to Sautika?'}{' '}
            <button
              type="button"
              onClick={() => setIsCreatingAccount((creating) => !creating)}
              className="inline-flex items-center gap-1 font-semibold text-sun-dark hover:underline"
            >
              {isCreatingAccount ? 'Sign In' : 'Create an Account'} <ArrowRight className="h-3 w-3" />
            </button>
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

'use client';
import Image from 'next/image';
import { ArrowRight, Lock, Mail, Smartphone, Wifi, type LucideIcon } from 'lucide-react';
import { continueWithEmail, continueWithGoogle } from '@/lib/auth';
import { GoogleG, Logo } from './Icons';

const BADGES: { icon: LucideIcon; a: string; b: string }[] = [
  { icon: Lock, a: 'Secure', b: '& Private' }, { icon: Wifi, a: 'Offline', b: 'Ready' }, { icon: Smartphone, a: 'Works on', b: 'Any Device' },
];

export default function SignIn() {
  return (
    <section id="signin" className="bg-mist px-6 py-12 md:px-16">
      <div className="mx-auto grid max-w-[1100px] items-center gap-10 md:grid-cols-[350px_1fr]">
        <div className="rounded-2xl bg-white p-8 shadow-[0_10px_40px_rgba(15,40,80,0.08)]">
          <div className="flex justify-center"><Logo dark size="lg" center /></div>
          <h2 className="mt-7 font-display text-[18px] font-semibold">Welcome Back!</h2>
          <p className="mt-1 text-[13px] text-slate-500">Sign in to continue your learning journey.</p>
          <button type="button" onClick={continueWithGoogle} className="mt-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-blue-600 text-[14px] font-semibold text-white hover:bg-blue-700">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white"><GoogleG className="h-4 w-4" /></span>Continue with Google
          </button>
          <div className="my-4 flex items-center gap-3 text-[12px] text-slate-500"><hr className="flex-1 border-slate-200" />or<hr className="flex-1 border-slate-200" /></div>
          <button type="button" onClick={continueWithEmail} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 text-[14px] font-semibold hover:border-ink">
            <Mail className="h-[18px] w-[18px]" /> Continue with Email
          </button>
          <p className="mt-5 text-center text-[11.5px] text-blue-900/70">Don&apos;t have an account? <a href="#signin" className="inline-flex items-center gap-1 font-semibold text-sun-dark">Get Started <ArrowRight className="h-3 w-3" /></a></p>
        </div>

        <div className="relative min-h-[330px] md:min-h-[340px]">
          <div aria-hidden className="absolute inset-y-0 left-0 right-0 rounded-[48%_52%_46%_54%/60%_40%_60%_40%] bg-blob" />
          <div className="relative z-10 max-w-[300px] py-8 pl-2 md:pl-8">
            <h2 className="font-display text-[26px] font-semibold leading-[1.15]">One account.<br />Endless possibilities.</h2>
            <p className="mt-3 text-[13px] leading-[1.7] text-slate-600">Access your lessons, track progress, earn rewards and build a brighter future — all in one place.</p>
            <ul className="mt-5 flex gap-3">
              {BADGES.map(({ icon: Icon, a, b }) => (
                <li key={a} className="flex w-[70px] flex-col items-center rounded-2xl bg-white px-1 pb-2.5 pt-3.5 text-center text-[10.5px] font-medium leading-tight shadow-sm">
                  <Icon className="mb-2 h-[22px] w-[22px] text-blue-900" strokeWidth={1.6} />{a}<br />{b}
                </li>
              ))}
            </ul>
          </div>
          <Image src="/images/boy.jpg" alt="A smiling student with a backpack looking up" width={266} height={345} sizes="266px"
            className="absolute bottom-0 right-0 z-0 h-[105%] w-auto max-w-none -translate-y-2 [mask-image:linear-gradient(to_right,transparent,#000_16%)] max-md:hidden md:block" />
        </div>
      </div>
    </section>
  );
}

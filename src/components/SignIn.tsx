import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Lock, Smartphone, Wifi, type LucideIcon } from 'lucide-react';
import { Logo } from './Icons';

const BADGES: { icon: LucideIcon; a: string; b: string }[] = [
  { icon: Lock, a: 'Secure', b: '& Private' }, { icon: Wifi, a: 'Offline', b: 'Ready' }, { icon: Smartphone, a: 'Works on', b: 'Any Device' },
];

export default function SignIn() {
  return (
    <section id="signin" className="bg-mist px-5 py-12 sm:px-8 md:py-16">
      <div className="mx-auto grid max-w-[1100px] items-center gap-10 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="w-full rounded-2xl bg-white p-6 shadow-[0_10px_40px_rgba(15,40,80,0.08)] sm:p-8">
          <div className="flex justify-center"><Logo dark size="lg" center /></div>
          <h2 className="mt-8 text-center font-display text-[21px] font-semibold tracking-tight">Welcome to Sautika!</h2>
          <p className="mt-2 text-center text-[13px] leading-relaxed text-slate-500">Learn in your language and grow your confidence, one lesson at a time.</p>
          <Link href="/sign-in" className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-navy-2">
            Sign In <ArrowRight className="h-4 w-4" />
          </Link>
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

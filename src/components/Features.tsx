import { Accessibility, CloudUpload, Languages, Mic, Star, type LucideIcon } from 'lucide-react';

const FEATURES: { icon: LucideIcon; title: string; text: string; bg: string; fg: string }[] = [
  { icon: Mic, title: 'Voice-First Learning', text: 'Ask questions and get answers using your voice — in your language.', bg: 'bg-amber-50', fg: 'text-amber-500' },
  { icon: Languages, title: 'Native Languages', text: 'Learn in Luganda, Swahili, Acholi, Ateso and Runyankole.', bg: 'bg-sky-50', fg: 'text-blue-600' },
  { icon: Accessibility, title: 'Dyslexia-Friendly', text: 'Custom fonts, high contrast and easy-to-read layouts.', bg: 'bg-emerald-50', fg: 'text-green-600' },
  { icon: CloudUpload, title: 'Works Offline', text: 'No internet? No problem. Keep learning, anywhere.', bg: 'bg-violet-50', fg: 'text-violet-500' },
  { icon: Star, title: 'Earn & Grow', text: 'Get learner coins, track your streaks and unlock new levels.', bg: 'bg-yellow-50', fg: 'text-sun' },
];

export default function Features() {
  return (
    <section id="features" className="bg-paper px-6 pb-16 pt-14 md:px-16">
      <div className="mx-auto max-w-[1100px] text-center">
        <span className="mx-auto mb-5 block h-0.5 w-10 rounded bg-sun" />
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em]">Why Sautika</p>
        <h2 className="mt-1.5 font-display text-[28px] font-bold leading-tight md:text-[30px]">Built for Real Learning, Real Lives</h2>
        <p className="mx-auto mt-4 max-w-[430px] text-[14px] leading-[1.6] text-slate-500">
          We combine the power of AI with local languages, inclusive design, and offline access to ensure every learner can thrive.
        </p>
        <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-5">
          {FEATURES.map(({ icon: Icon, title, text, bg, fg }) => (
            <li key={title} className="flex flex-col items-center">
              <span className={`grid h-[62px] w-[62px] place-items-center rounded-full ${bg}`}><Icon className={`h-7 w-7 ${fg}`} strokeWidth={2} /></span>
              <h3 className="mt-5 font-display text-[15px] font-semibold">{title}</h3>
              <p className="mt-2 max-w-[170px] text-[12.5px] leading-[1.7] text-slate-500">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

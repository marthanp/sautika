import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Icons';

export interface PolicySection {
  heading: string;
  paragraphs: string[];
}

export default function PolicyPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: PolicySection[];
}) {
  return (
    <main className="min-h-screen bg-mist px-5 py-8 sm:px-8 md:py-12">
      <div className="mx-auto max-w-[800px]">
        <Link href="/" aria-label="Sautika home" className="inline-flex rounded-lg">
          <Logo dark />
        </Link>
        <article className="mt-8 rounded-2xl bg-white p-6 shadow-[0_10px_40px_rgba(15,40,80,0.08)] sm:p-10">
          <Link href="/#about" className="inline-flex items-center gap-2 text-[13px] font-medium text-navy hover:text-sun-dark">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to Sautika
          </Link>
          <h1 className="mt-6 font-display text-[30px] font-bold tracking-tight sm:text-[36px]">{title}</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{intro}</p>
          <p className="mt-2 text-[12px] text-slate-500">Last updated: 11 October 2026</p>
          <div className="mt-8 space-y-7">
            {sections.map(({ heading, paragraphs }) => (
              <section key={heading}>
                <h2 className="font-display text-[17px] font-semibold">{heading}</h2>
                {paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-2 text-[13px] leading-[1.8] text-slate-600">{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        </article>
        <footer className="flex flex-wrap gap-x-5 gap-y-2 px-1 py-5 text-[12px] text-slate-600">
          <Link href="/cookie-policy" className="hover:text-navy">Cookie Policy</Link>
          <Link href="/terms-and-conditions" className="hover:text-navy">Terms and Conditions</Link>
          <Link href="/privacy-policy" className="hover:text-navy">Privacy Policy</Link>
        </footer>
      </div>
    </main>
  );
}

import Link from 'next/link';
import { MapPin, Phone } from 'lucide-react';
import { Logo } from './Icons';

const POLICIES = [
  { label: 'Cookie Policy', href: '/cookie-policy' },
  { label: 'Terms and Conditions', href: '/terms-and-conditions' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
] as const;

export default function Footer() {
  return (
    <footer id="about" className="bg-navy px-5 py-10 text-white sm:px-8 md:py-12">
      <div className="mx-auto max-w-[1100px]">
        <div className="grid gap-9 border-b border-white/15 pb-9 md:grid-cols-[1fr_1fr] md:items-start">
          <div className="space-y-5">
            <Link href="/" aria-label="Sautika home" className="inline-flex rounded-lg">
              <Logo />
            </Link>
            <p className="font-display text-[17px] font-semibold">
              Better Learning. <span className="text-sun">A Brighter Africa.</span>
            </p>
            <div id="help">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Need help?</h2>
              <a href="tel:+256772270027" className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg text-[14px] font-medium hover:text-sun">
                <Phone aria-hidden="true" className="h-4 w-4 text-sun" />
                +256 772 270 027
              </a>
            </div>
          </div>

          <div>
            <h2 className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              <MapPin aria-hidden="true" className="h-4 w-4 text-sun" />
              Find the Sautika team
            </h2>
            <p className="mb-3 text-[13px] text-white/80">Cavendish University Uganda, opposite the American Embassy, Kampala.</p>
            <iframe
              title="Map showing Cavendish University Uganda in Kampala"
              src="https://maps.google.com/maps?q=Cavendish%20University%20Uganda%2C%20Kampala&output=embed"
              className="h-44 w-full rounded-xl border border-white/15 bg-white/10"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <a
              href="https://www.google.com/maps/search/?api=1&query=Cavendish+University+Uganda%2C+Kampala"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-9 items-center text-[12px] font-medium text-sun hover:underline"
            >
              Open map directions
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-5 text-[11.5px] text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Sautika™. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            {POLICIES.map(({ label, href }) => (
              <Link key={href} href={href} className="hover:text-sun">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

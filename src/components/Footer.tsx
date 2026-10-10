import { Facebook, XLogo, YouTube, Logo } from './Icons';

const LINKS = [['Home', '#home'], ['Features', '#features'], ['About', '#about'], ['Help', '#help']] as const;

export default function Footer() {
  return (
    <footer id="about" className="bg-navy px-6 pb-6 pt-8 text-white md:px-12">
      <div id="help" className="mx-auto grid max-w-[1280px] items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <Logo />
        <nav aria-label="Footer" className="flex gap-9 text-[12px] font-medium md:justify-self-center">
          {LINKS.map(([l, h]) => <a key={l} href={h} className="hover:text-sun">{l}</a>)}
        </nav>
        <div className="flex items-center gap-8 md:justify-self-end">
          <div className="flex gap-4">
            <a href="https://youtube.com" aria-label="YouTube" className="hover:text-sun"><YouTube className="h-5 w-5" /></a>
            <a href="https://x.com" aria-label="X" className="hover:text-sun"><XLogo className="h-5 w-5" /></a>
            <a href="https://facebook.com" aria-label="Facebook" className="hover:text-sun"><Facebook className="h-5 w-5" /></a>
          </div>
          <p className="relative pb-2 text-[11.5px] font-medium after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-9 after:rounded after:bg-sun">Better learning. A brighter Africa.</p>
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-[1280px] text-[11px] text-white/80">© 2025 Sautika. All rights reserved.</p>
    </footer>
  );
}

import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
export const GoogleG = (p: P) => (
  <svg viewBox="0 0 48 48" aria-hidden {...p}>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.3-4 6.8-9.9 6.8-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.2-8.7 2.2-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);
export const YouTube = (p: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.500 0 9.400-.5a3 3 0 0 0 2.100-2.100A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.800zM9.600 15.600V8.400l6.200 3.600-6.200 3.600z" /></svg>);
export const XLogo = (p: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" /></svg>);
export const Facebook = (p: P) => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" /></svg>);

/** Sautika emblem: open book, sprout and spark. `leaf` is the book colour. */
export function Emblem({ leaf = '#fff', className }: { leaf?: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <g fill="#FFC400">
        <rect x="45" y="6" width="10" height="17" rx="5" />
        <rect x="45" y="6" width="10" height="17" rx="5" transform="rotate(-48 50 40)" />
        <rect x="45" y="6" width="10" height="17" rx="5" transform="rotate(48 50 40)" />
        <rect x="42.500" y="38" width="15" height="29" rx="7.500" />
      </g>
      <g fill={leaf}>
        <path d="M5 56c9 1 22 7 33 18 5 5 9 10 12 15-4-1-9-3-14-4-9-2-13-4-16-7-4-4-11-16-15-22z" opacity="0" />
        <path d="M6 55.500c0-2 2-3.500 4.500-3.200C26 54.500 41 68 50 87.500l-5 5.500c-8-8-15-9.500-26-12.500-4-1-6-2.500-7.500-5.500C9.500 69 6 57.500 6 55.500z" />
        <path d="M94 55.500c0-2-2-3.500-4.500-3.200C74 54.500 59 68 50 87.500l5 5.500c8-8 15-9.500 26-12.500 4-1 6-2.500 7.500-5.500C90.500 69 94 57.500 94 55.500z" />
      </g>
    </svg>
  );
}

export function Logo({ dark = false, size = 'md', center = false }: { dark?: boolean; size?: 'md' | 'lg'; center?: boolean }) {
  const txt = dark ? 'text-ink' : 'text-white';
  return (
    <span className={`inline-flex items-center gap-2 ${center ? 'justify-center' : ''}`}>
      <Emblem leaf={dark ? '#001731' : '#fff'} className={size === 'lg' ? 'h-11 w-11' : 'h-10 w-10'} />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-extrabold tracking-wide ${txt} ${size === 'lg' ? 'text-[26px]' : 'text-[24px]'}`}>
          SAUT<span className="relative">I<i className="absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sun" /></span>KA
        </span>
        <span className={`mt-1 text-[10.5px] font-medium tracking-wide ${dark ? 'text-ink/70' : 'text-white/80'}`}>Speak <b className="text-sun">•</b> Learn <b className="text-sun">•</b> Grow</span>
      </span>
    </span>
  );
}

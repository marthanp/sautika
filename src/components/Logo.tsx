export function Emblem({ leaf = '#fff', className }: { leaf?: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className}>
      <g fill="#FFC400"><rect x="45" y="6" width="10" height="17" rx="5" /><rect x="45" y="6" width="10" height="17" rx="5" transform="rotate(-48 50 40)" /><rect x="45" y="6" width="10" height="17" rx="5" transform="rotate(48 50 40)" /><rect x="42.5" y="38" width="15" height="29" rx="7.5" /></g>
      <g fill={leaf}><path d="M6 55.5c0-2 2-3.5 4.5-3.2C26 54.5 41 68 50 87.5l-5 5.500c-8-8-15-9.500-26-12.500-4-1-6-2.500-7.500-5.500C9.500 69 6 57.500 6 55.500z" /><path d="M94 55.500c0-2-2-3.500-4.500-3.200C74 54.500 59 68 50 87.500l5 5.500c8-8 15-9.500 26-12.500 4-1 6-2.500 7.500-5.500C90.500 69 94 57.500 94 55.500z" /></g>
    </svg>
  );
}
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Emblem className="h-12 w-12" />
      <span className="flex flex-col leading-none">
        <span className="text-[31px] font-extrabold tracking-wide text-white">SAUT<span className="relative">I<i className="absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sun" /></span>KA</span>
        <span className="mt-1 text-[12px] font-semibold text-white">Speak <b className="text-sun">•</b> Learn <b className="text-sun">•</b> Grow</span>
      </span>
    </span>
  );
}

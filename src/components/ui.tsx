import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

export const Card = ({ className = '', children }: { className?: string; children: ReactNode }) => (
  <div className={`rounded-2xl border border-line bg-white shadow-[0_2px_16px_rgba(20,50,100,0.05)] ${className}`}>{children}</div>
);
export const Bar = ({ v, color = '#FFC400', className = 'h-2' }: { v: number; color?: string; className?: string }) => (
  <div role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className={`overflow-hidden rounded-full bg-slate-200/70 ${className}`}>
    <i className="block h-full rounded-full" style={{ width: `${v}%`, background: color }} />
  </div>
);
export function Ring({ v, size = 100, stroke = 10, color = '#0E9F6E', children }: { v: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6EEF6" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} />
      </svg>
      <span className="absolute font-extrabold">{children}</span>
    </div>
  );
}
export const Disc = ({ color, size = 40, children }: { color: string; size?: number; children: ReactNode }) => (
  <span className="grid shrink-0 place-items-center rounded-full text-white" style={{ background: color, width: size, height: size }}>{children}</span>
);
export const Coin = ({ size = 28 }: { size?: number }) => (
  <span aria-hidden className="inline-grid shrink-0 place-items-center rounded-full border-[3px] border-[#F5A100] bg-[#FFC400] text-[#B97A00]" style={{ width: size, height: size }}><i className="block h-[45%] w-[45%] rounded-full border-2 border-[#E39A00]" /></span>
);
export const ViewAll = ({ href = '#', children = 'View All' }: { href?: string; children?: ReactNode }) => (
  <Link href={href} className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-blue-600 transition hover:text-blue-700">{children} <ArrowRight className="h-3.5 w-3.5 shrink-0" /></Link>
);
export const SubjectChip = ({ label, color }: { label: string; color: string }) => (
  <span className="absolute left-3 top-3 max-w-[calc(100%-24px)] truncate rounded-full bg-white px-3 py-1 text-[12px] sm:text-[13px] font-bold shadow-sm" style={{ color }}>{label}</span>
);

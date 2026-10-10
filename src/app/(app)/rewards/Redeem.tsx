'use client';
import { useState } from 'react';

export default function Redeem({ color }: { color: string }) {
  const [done, setDone] = useState(false);
  return <button onClick={() => setDone(true)} disabled={done} className="mt-5 h-12 w-full rounded-lg text-[16px] font-bold text-white disabled:opacity-60" style={{ background: color }}>{done ? 'Redeemed ✓' : 'Redeem'}</button>;
}

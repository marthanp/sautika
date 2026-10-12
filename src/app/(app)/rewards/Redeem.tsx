'use client';

import { useRef, useState } from 'react';
import { useLearnerAccount } from '@/components/LearnerDataSync';

export default function Redeem({ rewardId, color }: { rewardId: string; color: string }) {
  const { refresh } = useLearnerAccount();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  async function redeem() {
    setIsRedeeming(true);
    setError('');
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rewardRedeem', rewardId, idempotencyKey: idempotencyKey.current }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? 'Could not redeem this reward.');
      }
      setDone(true);
      await refresh();
    } catch (redeemError) {
      setError(redeemError instanceof Error ? redeemError.message : 'Could not redeem this reward.');
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        onClick={() => void redeem()}
        disabled={done || isRedeeming}
        className="mt-5 h-12 w-full rounded-lg text-[16px] font-bold text-white disabled:opacity-60"
        style={{ background: color }}
      >
        {isRedeeming ? 'Redeeming…' : done ? 'Redemption requested ✓' : 'Redeem'}
      </button>
    </>
  );
}

'use client';

import Image from 'next/image';
import { ArrowRight, BookOpen, Calendar, ClipboardList, Clock, FileText, Gift, Trophy, Sprout, Timer } from 'lucide-react';
import { Card, Coin, ViewAll } from '@/components/ui';
import { EARN } from '@/lib/data';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import Redeem from './Redeem';

const EARN_ICONS = [BookOpen, ClipboardList, FileText, Calendar, Trophy];
const REWARD_ICONS = [Gift, BookOpen, Timer, Gift];
const ACT_ICONS = [ClipboardList, FileText, ClipboardList, Calendar, Trophy];

export default function RewardsPage() {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const rewards = data?.rewards ?? [];
  const balance = profile?.coins ?? 0;
  const nextReward = rewards.find((reward) => reward.cost > balance);
  const towardNextReward = nextReward ? Math.min(100, Math.round((balance / nextReward.cost) * 100)) : 100;

  return (
    <div className="mx-auto max-w-[1330px] space-y-6">
      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden rounded-3xl bg-[#FEF4DA] p-5 sm:p-7">
        <div className="relative z-10 max-w-[540px]">
          <div className="flex items-center gap-3">
            <Coin size={46} />
            <h1 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl lg:text-[36px]">Coins &amp; Rewards</h1>
          </div>
          <p className="mt-2 max-w-[440px] text-xs leading-relaxed text-slate-600 sm:text-sm">
            Learn, complete, earn! Get rewarded for your progress and achievements.
          </p>
          <a
            href="#reward-store"
            className="mt-4 inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-sun px-4 text-xs font-bold text-navy shadow-xs transition hover:bg-sun-dark sm:text-sm sm:px-5"
          >
            View Rewards Store <ArrowRight className="h-4 w-4 shrink-0" />
          </a>
        </div>
        <Image
          src="/images/coins-art.png"
          alt="Stack of coins and a gift box. Small efforts, big rewards."
          width={405}
          height={207}
          className="absolute inset-y-0 right-0 hidden h-full w-auto opacity-90 [mask-image:linear-gradient(to_right,transparent,#000_14%)] md:block"
        />
      </section>

      {/* ── Your Coins — full-width strip ── */}
      <div className="rounded-3xl bg-[#FEF6E0] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Coin size={42} />
            <div>
              <h2 className="text-[18px] sm:text-[20px] font-extrabold text-navy">Your Coins</h2>
              <p className="text-xs text-slate-500">10 coins per completed lesson</p>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <b className="text-[40px] sm:text-[46px] font-extrabold leading-none text-navy">{balance}</b>
            <span className="mb-1.5 text-xs sm:text-sm text-slate-600 font-medium">coins available</span>
          </div>
          <div className="w-full sm:w-72">
            <div className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
              <i className="block h-full rounded-full bg-sun transition-all duration-300" style={{ width: `${towardNextReward}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              {nextReward ? `${nextReward.cost - balance} coins until "${nextReward.title}"` : 'You can afford every available reward!'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Ways to Earn — full-width ── */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <Trophy className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-sun" />
            <div className="min-w-0">
              <h2 className="text-[18px] sm:text-[20px] font-extrabold text-navy">Ways to Earn Coins</h2>
              <p className="text-xs sm:text-[13px] text-slate-500">Complete activities and keep learning to earn coins.</p>
            </div>
          </div>
          <ViewAll href="/courses">Start Learning</ViewAll>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
          {EARN.map(([t, c, col], i) => {
            const I = EARN_ICONS[i];
            return (
              <li key={t} className="flex flex-col items-center justify-between rounded-xl border border-line bg-white/70 p-3 sm:p-4 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-full text-white shadow-xs" style={{ background: col }}>
                  <I className="h-5 w-5" />
                </span>
                <b className="mt-2.5 block text-xs sm:text-[13px] font-bold text-slate-800 leading-tight">{t}</b>
                <span className="mt-2.5 inline-block whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-800">
                  {c}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ── Redeem Your Rewards — full-width ── */}
      <section id="reward-store">
        <Card className="p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <Gift className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <h2 className="text-[18px] sm:text-[20px] font-extrabold text-navy">Redeem Your Rewards</h2>
                <p className="text-xs sm:text-[13px] text-slate-500">Use your coins to get exciting rewards and special benefits.</p>
              </div>
            </div>
            <ViewAll href="#reward-store">Store</ViewAll>
          </div>
          <ul className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            {rewards.map((reward, i) => {
              const Icon = REWARD_ICONS[i % REWARD_ICONS.length];
              return (
                <li
                  key={reward.id}
                  className="flex flex-col rounded-xl border border-line p-4 sm:p-5"
                  style={{ background: reward.background }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Icon className="h-9 w-9 sm:h-10 sm:w-10 shrink-0" style={{ color: reward.color }} />
                    <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-slate-800 shadow-xs">
                      <Coin size={14} />{reward.cost} coins
                    </span>
                  </div>
                  <b className="mt-2.5 block text-sm sm:text-[15px] font-bold text-slate-900">{reward.title}</b>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600 break-words">
                    {reward.description}
                  </p>
                  <div className="mt-3.5">
                    <Redeem rewardId={reward.id} color={reward.color} />
                  </div>
                </li>
              );
            })}
          </ul>
          {!rewards.length ? <p className="mt-4 text-xs text-slate-500">Loading available rewards…</p> : null}
        </Card>
      </section>

      {/* ── Bottom row: Recent Activity + Keep Going ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-[17px] font-extrabold text-navy">
            <Clock className="h-5 w-5 text-slate-600" />Recent Activity
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {(data?.activity ?? [])
              .filter((activity) => activity.type === 'coin')
              .map((activity, i) => {
                const Icon = ACT_ICONS[i % ACT_ICONS.length];
                return (
                  <li key={activity.id} className="flex items-center gap-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-xs">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-xs sm:text-[13px] font-semibold text-slate-800 leading-tight">
                      <span className="block">{activity.title}</span>
                      <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap text-xs font-bold text-slate-800">
                      <Coin size={15} />
                      {activity.amount > 0 ? '+' : ''}{activity.amount}
                    </span>
                  </li>
                );
              })}
            {!data?.activity.some((activity) => activity.type === 'coin') ? (
              <li className="py-4 text-xs text-slate-500">Coin activity will appear here when you complete lessons.</li>
            ) : null}
          </ul>
        </Card>

        <div className="relative flex items-center gap-3.5 overflow-hidden rounded-2xl bg-[#E4F7EF] p-5">
          <Sprout className="h-8 w-8 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1 pr-14">
            <b className="block text-[17px] text-navy">Keep Going!</b>
            <p className="mt-0.5 text-xs leading-snug text-slate-600">
              You&apos;re building a brighter future, one coin at a time.
            </p>
          </div>
          <Image
            src="/images/keep-going.png"
            alt="Small steps, big dreams"
            width={110}
            height={90}
            className="absolute bottom-1 right-2 h-auto w-20 opacity-80 mix-blend-multiply"
          />
        </div>
      </div>
    </div>
  );
}

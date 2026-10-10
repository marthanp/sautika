import Image from 'next/image';
import { ArrowRight, BookOpen, Calendar, ClipboardList, Clock, FileText, Gift, Trophy, TrendingUp, Sprout, Timer } from 'lucide-react';
import { Card, Coin, ViewAll } from '@/components/ui';
import { COIN_ACTIVITY, EARN, REWARDS } from '@/lib/data';
import Redeem from './Redeem';

const EARN_ICONS = [BookOpen, ClipboardList, FileText, Calendar, Trophy];
const REWARD_ICONS = [Gift, BookOpen, Timer, Gift];
const ACT_ICONS = [ClipboardList, FileText, ClipboardList, Calendar, Trophy];

export default function RewardsPage() {
  return (
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 space-y-6 xl:col-span-8">
        <section className="relative overflow-hidden rounded-3xl bg-[#FEF4DA] p-7">
          <div className="relative z-10 max-w-[440px]">
            <div className="flex items-center gap-4"><Coin size={58} /><h1 className="text-[38px] font-extrabold">Coins &amp; Rewards</h1></div>
            <p className="mt-3 max-w-[380px] text-[16px] leading-relaxed text-slate-600">Learn, complete, earn! Get rewarded for your progress and achievements.</p>
            <button className="mt-5 flex h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-sun px-4 text-[14px] font-bold sm:gap-3 sm:px-6 sm:text-[16px]">View Rewards Store <ArrowRight className="h-5 w-5 shrink-0" /></button>
          </div>
          <Image src="/images/coins-art.png" alt="Stack of coins and a gift box. Small efforts, big rewards." width={405} height={207} className="absolute inset-y-0 right-0 hidden h-full w-auto [mask-image:linear-gradient(to_right,transparent,#000_14%)] md:block" />
        </section>
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-4"><Trophy className="h-9 w-9 shrink-0 text-sun" /><div className="min-w-0"><h2 className="text-[21px] font-extrabold">Ways to Earn Coins</h2><p className="text-[14px] text-slate-500">Complete activities and keep learning to earn coins.</p></div></div><ViewAll /></div>
          <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-5">{EARN.map(([t, c, col], i) => { const I = EARN_ICONS[i]; return (
            <li key={t} className="rounded-xl border border-line bg-white/60 p-4 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white" style={{ background: col }}><I className="h-7 w-7" /></span><b className="mt-3 block text-[14px]">{t}</b><span className="mt-3 inline-block rounded-full bg-emerald-50 px-4 py-1.5 text-[13px] font-bold">{c}</span></li>); })}</ul>
        </Card>
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-4"><Gift className="h-9 w-9 shrink-0 text-blue-600" /><div className="min-w-0"><h2 className="text-[21px] font-extrabold">Redeem Your Rewards</h2><p className="text-[14px] text-slate-500">Use your coins to get exciting rewards and special benefits.</p></div></div><ViewAll /></div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{REWARDS.map((r, i) => { const I = REWARD_ICONS[i]; return (
            <li key={r.title} className="rounded-xl border border-line p-5" style={{ background: r.bg }}><div className="flex items-start justify-between"><I className="h-12 w-12" style={{ color: r.color }} /><span className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[12px] font-semibold"><Coin size={16} />{r.cost} coins</span></div>
              <b className="mt-3 block text-[16px]">{r.title}</b><p className="mt-1 min-h-[42px] text-[13px] leading-snug text-slate-600">{r.text}</p><Redeem color={r.color} /></li>); })}</ul>
        </Card>
      </div>
      <aside className="min-w-0 space-y-5 xl:col-span-4">
        <div className="rounded-3xl bg-[#FEF6E0] p-6"><div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[21px] font-extrabold"><Coin size={40} />Your Coins</h2><Coin size={54} /></div>
          <p className="mt-4 flex items-end justify-between"><span><b className="text-[52px] font-extrabold leading-none">320</b> <span className="text-[16px] text-slate-600">coins earned</span></span><span className="mb-1 text-right text-[12px] text-slate-500"><b className="flex items-center gap-1 text-[14px] text-emerald-600"><TrendingUp className="h-4 w-4" />+50</b>this week</span></p>
          <div className="mt-4 h-3 rounded-full bg-slate-200"><i className="block h-full w-[64%] rounded-full bg-sun" /></div><p className="mt-4 text-[14px] text-slate-600">180 coins to next reward</p></div>
        <Card className="p-6"><h2 className="flex items-center gap-3 text-[20px] font-extrabold"><Clock className="h-6 w-6" />Recent Activity</h2>
          <ul className="mt-3 divide-y divide-line">{COIN_ACTIVITY.map((a, i) => { const I = ACT_ICONS[i]; return (
            <li key={a.title} className="flex items-center gap-4 py-3.5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white" style={{ background: a.color }}><I className="h-5 w-5" /></span><span className="flex-1 text-[14px] font-semibold leading-tight">{a.title}<span className="mt-1 block text-[12px] font-normal text-slate-500">{a.sub}</span></span><span className="flex items-center gap-1.5 text-[13px] font-bold"><Coin size={18} />{a.coins}</span></li>); })}</ul></Card>
        <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-[#E4F7EF] p-6"><Sprout className="h-9 w-9 shrink-0 text-emerald-600" /><div><b className="text-[20px]">Keep Going!</b><p className="mt-1 max-w-[190px] text-[13px] leading-snug text-slate-600">You&apos;re building a brighter future, one coin at a time.</p></div><Image src="/images/keep-going.png" alt="Small steps, big dreams" width={110} height={90} className="absolute bottom-2 right-3 h-auto w-[104px] mix-blend-multiply" /></div>
      </aside>
    </div>
  );
}

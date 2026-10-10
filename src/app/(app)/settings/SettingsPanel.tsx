'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Bell, Camera, ChevronDown, ChevronRight, CircleHelp, KeyRound, LogOut, Mail, Palette, Phone, Shield, ShieldCheck, User, Compass } from 'lucide-react';
import { Card } from '@/components/ui';

const SECTIONS = [
  { id: 'Account', text: 'Profile, personal info and security', icon: User }, { id: 'Appearance', text: 'Theme, display and language', icon: Palette },
  { id: 'Notifications', text: 'Alerts, reminders and updates', icon: Bell }, { id: 'Learning Preferences', text: 'Study goals and pace', icon: Compass },
  { id: 'Privacy & Security', text: 'Data, permissions and access', icon: Shield }, { id: 'Help & Support', text: 'Get help or contact us', icon: CircleHelp },
];
const field = 'mt-1.5 flex h-[46px] min-w-0 items-center rounded-xl border border-line bg-[#F8FAFD] px-3 text-[14px]';

export default function SettingsPanel() {
  const [sec, setSec] = useState('Account');
  const [tfa, setTfa] = useState(false);
  const cur = SECTIONS.find((s) => s.id === sec)!;
  return (
    <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(250px,0.75fr)_minmax(0,2fr)] xl:grid-cols-[minmax(250px,0.7fr)_minmax(0,2fr)]">
      <Card className="min-w-0 self-start p-2.5">
        {SECTIONS.map(({ id, text, icon: I }) => (
          <button key={id} aria-current={sec === id} onClick={() => setSec(id)} className="flex min-w-0 w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left aria-[current=true]:bg-[#FFF3D0]">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${sec === id ? 'bg-sun' : 'border border-line bg-white'}`}><I className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1 break-words text-[15px] font-bold leading-tight">{id}<span className="block text-[12.5px] font-normal text-slate-500">{text}</span></span><ChevronRight className="h-4 w-4 shrink-0" />
          </button>))}
      </Card>
      {sec !== 'Account' ? (
        <Card className="min-w-0 p-6"><h2 className="text-[19px] font-extrabold">{cur.id}</h2><p className="mt-1 text-[14px] text-slate-500">{cur.text}.</p><p className="mt-6 rounded-xl bg-[#F8FAFD] p-5 text-[14px] text-slate-600">These settings are coming soon.</p></Card>
      ) : (
        <div className="min-w-0 space-y-4">
          <Card className="p-6">
            <h2 className="text-[19px] font-extrabold">Account Settings</h2><p className="mt-1 text-[14px] text-slate-500">Update your personal information and account details.</p>
            <div className="mt-4 flex items-center gap-4"><span className="relative"><Image src="/images/aisha.jpg" alt="Aisha" width={89} height={86} className="h-[88px] w-[88px] rounded-full object-cover" /><span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white"><Camera className="h-4 w-4" /></span></span>
              <div><b className="text-[14px]">Profile Photo</b><p className="text-[12.5px] text-slate-500">Choose a clear photo (optional).</p><button className="mt-2 h-10 rounded-lg border border-blue-200 px-5 text-[14px] font-semibold text-blue-700">Change Photo</button></div></div>
            <div className="mt-5 grid gap-x-7 gap-y-4 2xl:grid-cols-2">
              <label className="min-w-0 text-[13px] font-semibold">Full Name<div className={field}>Aisha N.</div></label>
              <label className="min-w-0 text-[13px] font-semibold">Grade / Class<div className={`${field} justify-between`}><span className="truncate">Primary 6</span><ChevronDown className="h-4 w-4 shrink-0" /></div></label>
              <label className="min-w-0 text-[13px] font-semibold">Email Address<div className={`${field} justify-between`}><span className="truncate">aisha.n@example.com</span><Mail className="h-4 w-4 shrink-0 text-slate-500" /></div></label>
              <label className="min-w-0 text-[13px] font-semibold">Phone Number<div className={`${field} justify-between`}><span className="truncate">+256 700 123 456</span><Phone className="h-4 w-4 shrink-0 text-slate-500" /></div></label>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-700"><ShieldCheck className="h-6 w-6" /></span><div><b className="text-[16px]">Account Security</b><p className="text-[12.5px] text-slate-500">Keep your account safe and secure.</p></div></div>
            <button className="mt-3 flex w-full items-center gap-4 text-left"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><KeyRound className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="text-[15px]">Change Password</b><span className="block text-[12.5px] text-slate-500">Update your password regularly.</span></span><ChevronRight className="h-4 w-4 shrink-0" /></button>
            <div className="mt-3 flex items-center gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><Shield className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="text-[15px]">Two-Factor Authentication</b><span className="block text-[12.5px] text-slate-500">Add an extra layer of security.</span></span>
              <button role="switch" aria-checked={tfa} aria-label="Two-factor authentication" onClick={() => setTfa(!tfa)} className={`relative h-6 w-11 rounded-full transition-colors ${tfa ? 'bg-emerald-500' : 'bg-slate-300'}`}><i className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${tfa ? 'left-[22px]' : 'left-0.5'}`} /></button></div>
            <div className="mt-4 flex items-center gap-4 rounded-xl bg-[#EEF5FB] p-4"><ShieldCheck className="h-7 w-7 shrink-0 text-emerald-600" /><span className="min-w-0 flex-1"><b className="text-[14px] text-emerald-800">Your account is secure</b><span className="block text-[12px] text-slate-600">Last active: Today, 4:32 PM</span></span><ChevronRight className="h-4 w-4 shrink-0" /></div>
            <button className="mt-5 flex h-12 items-center gap-3 rounded-xl border border-red-300 px-5 text-[15px] font-bold text-red-600"><LogOut className="h-5 w-5" />Log Out</button>
          </Card>
        </div>
      )}
    </div>
  );
}

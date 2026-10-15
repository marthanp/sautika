'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Calendar, Clock, Flame, Headphones, Sprout, Star, Target, Trophy } from 'lucide-react';
import { Bar, Card, Coin, ViewAll } from '@/components/ui';
import { SUBJECTS } from '@/lib/data';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import { SUBJECT_BY_CATEGORY } from '@/lib/course-display';
import { coursesForClass } from '@/lib/course-access';
import { hasSunbirdTts, isSunbirdLanguage, SUNBIRD_LANGUAGES, type VoiceLang } from '@/lib/sunbird-languages';

function splitForSpeech(text: string, maxLength = 580): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export default function ProgressPage() {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const [reportLanguage, setReportLanguage] = useState<VoiceLang>('eng');
  const [reportAction, setReportAction] = useState<'download' | 'listen' | null>(null);
  const [reportError, setReportError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const reportAudio = useRef<HTMLAudioElement | null>(null);
  const speechRun = useRef(0);
  const courses = coursesForClass(data?.courses ?? [], profile.educationLevel);
  const progressByCourse = new Map((data?.courseProgress ?? []).map((item) => [item.courseId, item]));
  const totalLessons = courses.reduce((total, course) => total + course.lessons.length, 0);
  const completedLessons = courses.reduce(
    (total, course) => total + (progressByCourse.get(course.id)?.completedLessonIndexes.length ?? 0),
    0,
  );
  const completedCourses = courses.filter((course) => {
    const progress = progressByCourse.get(course.id);
    return course.lessons.length > 0 && (progress?.completedLessonIndexes.length ?? 0) >= course.lessons.length;
  }).length;
  const completion = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  function buildReport(): string {
    const courseLines = courses.map((course) => {
      const completed = progressByCourse.get(course.id)?.completedLessonIndexes.length ?? 0;
      const percent = course.lessons.length ? Math.round((completed / course.lessons.length) * 100) : 0;
      return `- ${course.title}: ${completed} of ${course.lessons.length} lessons complete (${percent}%).`;
    });
    const activityLines = (data?.activity ?? []).slice(0, 10).map((activity) =>
      `- ${new Date(activity.date).toLocaleDateString()}: ${activity.title} (${activity.type === 'lesson' ? `${activity.amount} XP` : `${activity.amount} coins`}).`,
    );
    return [
      'Learner Progress Report',
      `Report date: ${new Date().toLocaleDateString()}`,
      `Learner: ${[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Learner'}`,
      `Class: ${profile.educationLevel}`,
      '',
      'Overall summary',
      `Completed courses: ${completedCourses} of ${courses.length}.`,
      `Lessons completed: ${completedLessons} of ${totalLessons} (${completion}%).`,
      `Learner coins: ${profile.coins ?? 0}.`,
      `Current learning streak: ${profile.streak ?? 0} days.`,
      `Experience points: ${profile.xp ?? 0}.`,
      '',
      'Course progress',
      ...(courseLines.length ? courseLines : ['No course progress is available yet.']),
      '',
      'Recent activity',
      ...(activityLines.length ? activityLines : ['No recent activity is available yet.']),
    ].join('\n');
  }

  async function translatedReport(): Promise<string> {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: buildReport(), sourceLanguage: 'eng', targetLanguage: reportLanguage }),
    });
    const result = await response.json() as { text?: string; error?: string };
    if (!response.ok || !result.text) {
      throw new Error(result.error ?? 'Could not translate the learner report.');
    }
    return result.text;
  }

  async function downloadReport(): Promise<void> {
    setReportError('');
    setReportAction('download');
    try {
      const report = await translatedReport();
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const learnerName = (profile.firstName || 'learner').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      link.href = url;
      link.download = `${learnerName || 'learner'}-progress-report-${reportLanguage}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Could not download the learner report.');
    } finally {
      setReportAction(null);
    }
  }

  async function listenToReport(): Promise<void> {
    if (isSpeaking) {
      speechRun.current += 1;
      reportAudio.current?.pause();
      reportAudio.current = null;
      setIsSpeaking(false);
      return;
    }
    setReportError('');
    setReportAction('listen');
    try {
      const report = await translatedReport();
      const audioUrls: string[] = [];
      for (const chunk of splitForSpeech(report)) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chunk, language: reportLanguage }),
        });
        const result = await response.json() as { audioUrl?: string; error?: string };
        if (!response.ok || !result.audioUrl) {
          throw new Error(result.error ?? 'Could not create audio for the learner report.');
        }
        audioUrls.push(result.audioUrl);
      }

      const currentRun = ++speechRun.current;
      const playChunk = (index: number): void => {
        if (currentRun !== speechRun.current) return;
        const audio = new Audio(audioUrls[index]);
        reportAudio.current = audio;
        audio.onended = () => {
          if (currentRun !== speechRun.current) return;
          if (index + 1 < audioUrls.length) {
            playChunk(index + 1);
          } else {
            reportAudio.current = null;
            setIsSpeaking(false);
          }
        };
        audio.onerror = () => {
          if (currentRun !== speechRun.current) return;
          reportAudio.current = null;
          setIsSpeaking(false);
          setReportError('Could not play the learner report audio.');
        };
        void audio.play().catch((error: unknown) => {
          if (currentRun !== speechRun.current) return;
          reportAudio.current = null;
          setIsSpeaking(false);
          setReportError(error instanceof Error ? error.message : 'Could not play the learner report audio.');
        });
      };
      if (!audioUrls.length) throw new Error('The translated learner report was empty.');
      playChunk(0);
      setIsSpeaking(true);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Could not play the learner report.');
    } finally {
      setReportAction(null);
    }
  }

  useEffect(() => () => {
    speechRun.current += 1;
    reportAudio.current?.pause();
  }, []);

  return (
    <div className="mx-auto max-w-[1330px]">
      <header>
        <p className="text-[19px] font-bold">Hello, {profile?.firstName || 'Learner'}! 👋</p>
        <h1 className="mt-1 text-[30px] font-extrabold leading-tight sm:text-[36px] lg:text-[40px]">Your Learning Progress</h1>
        <p className="mt-2 text-[16px] text-slate-500">Track your progress, celebrate your achievements, and keep going!</p>
      </header>

      <section aria-label="Progress summary" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-blue-100 bg-[#EEF5FE] p-4 sm:p-5"><p className="flex items-center gap-3 text-[14px] font-bold"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white"><BookOpen className="h-5 w-5" /></span><span>Courses Completed</span></p><p className="mt-4 text-[34px] font-extrabold">{completedCourses} <span className="text-[22px] font-medium text-slate-500">/ {courses.length}</span></p><div className="mt-3 flex items-center gap-3"><div className="min-w-0 flex-1"><Bar v={courses.length ? (completedCourses / courses.length) * 100 : 0} color="#2F6BFF" /></div><span className="shrink-0 text-[12px] font-bold text-blue-600">{courses.length ? Math.round((completedCourses / courses.length) * 100) : 0}%</span></div></div>
        <div className="min-w-0 rounded-2xl border border-amber-100 bg-[#FEF8E8] p-4 sm:p-5"><p className="flex items-center gap-3 text-[14px] font-semibold"><Star className="h-9 w-9 shrink-0 fill-sun text-sun" /><span>Learner Coins</span></p><p className="mt-4 flex items-center justify-between gap-3 text-[34px] font-extrabold">{profile?.coins ?? 0}<Coin size={36} /></p><p className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-emerald-600"><span>Earn coins by completing lessons</span></p></div>
        <div className="min-w-0 rounded-2xl border border-emerald-100 bg-[#EAF8F0] p-4 sm:p-5"><p className="flex items-center gap-3 text-[14px] font-bold"><Flame className="h-9 w-9 shrink-0 fill-blue-500 text-blue-600" /><span>Current Streak</span></p><p className="mt-4 text-[34px] font-extrabold">{profile?.streak ?? 0} days</p><p className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-emerald-700"><Calendar className="h-4 w-4 shrink-0" />Keep it up!</p></div>
        <div className="min-w-0 rounded-2xl border border-violet-100 bg-[#F4EFFE] p-4 sm:p-5"><p className="flex items-center gap-3 text-[14px] font-bold"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-600 text-white"><Target className="h-5 w-5" /></span><span>Overall Progress</span></p><p className="mt-4 text-[34px] font-extrabold">{completion}%</p><div className="mt-3"><Bar v={completion} color="#6D4DFF" /></div><p className="mt-2 text-[12px] text-slate-600">{completedLessons} of {totalLessons} lessons</p></div>
      </section>

      <Card className="mt-6 min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[19px] font-extrabold">Share a learner report</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
              Choose a language to download or listen to a translated summary of this learner&apos;s progress.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="progress-report-language" className="text-sm font-semibold">Report language</label>
            <select
              id="progress-report-language"
              value={reportLanguage}
              disabled={reportAction !== null || isSpeaking}
              onChange={(event) => {
                if (isSunbirdLanguage(event.target.value)) setReportLanguage(event.target.value);
              }}
              className="min-h-11 max-w-full rounded-xl border-2 border-ln bg-card px-3"
            >
              {SUNBIRD_LANGUAGES.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void downloadReport()}
            disabled={reportAction !== null}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-navy px-4 text-sm font-bold text-white hover:bg-navy/90 disabled:cursor-wait disabled:opacity-60"
          >
            <ArrowDownToLine className="h-4 w-4" />
            {reportAction === 'download' ? 'Preparing report…' : 'Download report'}
          </button>
          <button
            type="button"
            onClick={() => void listenToReport()}
            disabled={reportAction !== null || (!isSpeaking && !hasSunbirdTts(reportLanguage))}
            aria-pressed={isSpeaking}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-navy px-4 text-sm font-bold text-navy hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Headphones className="h-4 w-4" />
            {reportAction === 'listen' ? 'Preparing audio…' : isSpeaking ? 'Stop listening' : 'Listen to report'}
          </button>
        </div>
        {!hasSunbirdTts(reportLanguage) ? (
          <p className="mt-3 text-sm text-slate-600">Sunbird can translate and download this report in {SUNBIRD_LANGUAGES.find(({ code }) => code === reportLanguage)?.name}, but does not currently provide a voice for it.</p>
        ) : null}
        {reportError ? <p role="alert" className="mt-3 text-sm text-red-700">{reportError}</p> : null}
      </Card>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex min-w-0 items-center gap-3 text-[19px] font-extrabold"><BookOpen className="h-6 w-6 shrink-0 text-blue-600" /><span>Course Progress</span></h2><ViewAll href="/courses">View Courses</ViewAll></div>
          <ul className="mt-5 space-y-4">{courses.map((course) => {
              const subject = SUBJECT_BY_CATEGORY[course.cat];
              const { icon: Icon, color } = SUBJECTS[subject];
              const done = progressByCourse.get(course.id)?.completedLessonIndexes.length ?? 0;
              const percent = course.lessons.length ? Math.round((done / course.lessons.length) * 100) : 0;
              return (
                <li key={course.id} className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white" style={{ background: color }}><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0"><p className="break-words text-[14px] font-semibold leading-snug">{course.title}</p><Bar v={percent} color={color} className="mt-2 h-2" /></div><div className="text-right"><b className="block whitespace-nowrap text-[13px]">{percent}%</b><span className="whitespace-nowrap text-[11px] text-slate-500">{done}/{course.lessons.length}</span></div></li>
              );
            })}{!courses.length ? <li className="text-sm text-slate-500">Course progress will appear here as you learn.</li> : null}</ul>
        </Card>
        <Card className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex min-w-0 items-center gap-3 text-[19px] font-extrabold"><Clock className="h-6 w-6 shrink-0" /><span>Recent Activity</span></h2><ViewAll href="/rewards">View Activity</ViewAll></div>
          <ul className="mt-3 divide-y divide-line">{(data?.activity ?? []).map((activity) => (
            <li key={activity.id} className="flex min-w-0 flex-wrap items-center gap-3 py-3.5 sm:flex-nowrap"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white">{activity.type === 'lesson' ? <BookOpen className="h-5 w-5" /> : <Star className="h-5 w-5" />}</span><span className="min-w-0 flex-1 basis-[calc(100%-3.25rem)] break-words text-[14px] font-semibold leading-tight sm:basis-0">{activity.title}<span className="mt-1 block text-[12px] font-normal text-slate-500">{new Date(activity.date).toLocaleDateString()}</span></span>
              <span className={`ml-[52px] max-w-full whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-bold sm:ml-0 ${activity.amount < 0 ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'}`}>{activity.type === 'lesson' ? `+${activity.amount} XP` : `${activity.amount > 0 ? '+' : ''}${activity.amount} coins`}</span></li>
          ))}{!data?.activity.length ? <li className="py-4 text-sm text-slate-500">Your learning and coin activity will appear here.</li> : null}</ul>
        </Card>
      </div>

      <aside className="mt-6 grid min-w-0 gap-5 md:grid-cols-3">
        <div className="relative min-h-[220px] overflow-hidden rounded-2xl md:min-h-0">
          <Image src="/images/progress-banner.jpg" alt="Aisha looking at the mountains at sunset. Small steps today, big dreams tomorrow." fill sizes="(min-width: 768px) 33vw, 100vw" priority className="object-cover" />
        </div>
        <div className="min-w-0 rounded-2xl bg-[#FEF6DC] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex min-w-0 items-center gap-3 text-[18px] font-extrabold"><Trophy className="h-7 w-7 shrink-0 text-sun" /><span>Your Achievements</span></h2><ViewAll href="/rewards">View All</ViewAll></div>
          <p className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">Achievements will appear here as you complete learning milestones.</p></div>
        <Link href="/courses" className="flex min-w-0 items-center gap-4 rounded-2xl bg-[#E9F3FD] p-5 transition hover:bg-blue-100/70"><Sprout className="h-9 w-9 shrink-0 text-emerald-600" /><div className="min-w-0 flex-1"><b className="text-[16px]">You&apos;re making great progress!</b><p className="mt-1 text-[13px] leading-snug text-slate-600">Keep learning, {profile?.firstName || 'Learner'}. Your efforts are building a brighter future.</p></div><ArrowRight className="h-4 w-4 shrink-0 text-blue-600" /></Link>
      </aside>
    </div>
  );
}

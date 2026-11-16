'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BookOpen,
  Brain,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  FileText,
  HelpCircle,
  ListChecks,
  Loader2,
  Mic,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Note } from '@/data/catalog';
import { COURSES } from '@/data/courses';
import type { Course, Lesson, VoiceLang } from '@/types';
import { hasSunbirdTts, SUNBIRD_LANGUAGES } from '@/lib/sunbird-languages';
import { useApp } from '@/store/useApp';
import { useUITranslation } from '@/lib/useUITranslation';
import { triggerFeedback } from '@/lib/feedback';
import { useVoice } from '@/hooks/useVoice';
import { useLearnerAccount } from '@/components/providers/LearnerDataSync';

const MAX_SOURCES = 8;
const MAX_QUESTION_CHARS = 1000;
const UPLOAD_ACCEPT = '.pdf,.docx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp';

type TutorMode = 'ask' | 'summary' | 'guide' | 'lesson';
type SourceType = 'lesson' | 'document' | 'notes';

const ACTIONS: { mode: TutorMode; label: string; hint: string; icon: LucideIcon }[] = [
  { mode: 'ask', label: 'Ask a Question', hint: 'Get instant answers with text & audio', icon: HelpCircle },
  { mode: 'summary', label: 'Summarise', hint: 'Main key points in bullets', icon: ListChecks },
  { mode: 'guide', label: 'Study Guide', hint: 'Core ideas, terms and practice', icon: BookOpen },
  { mode: 'lesson', label: 'Quiz Me', hint: '5 questions to test knowledge', icon: Brain },
];

const SUGGESTED_QUESTIONS = [
  'Explain the main idea in simple words',
  'Give me 3 practical everyday examples',
  'What are the key words to remember?',
  'How do I apply this concept in a test?',
];

interface QuizItem {
  q: string;
  a: string;
  d: [string, string];
  e?: string;
}

type Result =
  | { kind: 'text'; mode: TutorMode; answer: string; provider: string; sourceName: string }
  | { kind: 'quiz'; items: QuizItem[]; provider: string; sourceName: string };

function languageName(code: VoiceLang): string {
  return SUNBIRD_LANGUAGES.find((lang) => lang.code === code)?.name ?? 'English';
}

function stripCitations(text: string): string {
  return text.replace(/\[\d{1,2}\]/g, '').replace(/[ \t]{2,}/g, ' ').trim();
}

function withCitations(text: string): ReactNode[] {
  return text.split(/(\[\d{1,2}\])/g).map((part, index) => {
    if (/^\[\d{1,2}\]$/.test(part)) {
      return (
        <sup
          key={index}
          className="mx-0.5 rounded bg-sun/30 px-1 py-[1px] text-[10px] font-bold text-navy"
          title="From this source"
        >
          {part.slice(1, -1)}
        </sup>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function StudyTutor({
  notes,
  onSaveAsNote,
}: {
  notes: Note[];
  onSaveAsNote: (note: { title: string; text: string }) => void;
}) {
  const dialect = useApp((state) => state.dialect || 'eng');
  const t = useUITranslation();
  const { data: learnerData } = useLearnerAccount();

  // Voice recognition
  const { recording, processing: sttProcessing, toggleMic } = useVoice();

  // Source Type tab: 'lesson' | 'document' | 'notes'
  const [sourceType, setSourceType] = useState<SourceType>('lesson');

  // Lesson source state
  const allCourses: Course[] = useMemo(() => {
    return (learnerData?.courses && learnerData.courses.length > 0) ? learnerData.courses : COURSES;
  }, [learnerData?.courses]);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(allCourses[0]?.id || '');
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number>(0);

  const selectedCourse = useMemo(() => {
    return allCourses.find((c) => c.id === selectedCourseId) || allCourses[0];
  }, [allCourses, selectedCourseId]);

  const selectedLesson = useMemo(() => {
    return selectedCourse?.lessons?.[selectedLessonIndex] || selectedCourse?.lessons?.[0];
  }, [selectedCourse, selectedLessonIndex]);

  // Document / Note source state
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [uploadedDoc, setUploadedDoc] = useState<{ name: string; text: string } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocStatus, setUploadDocStatus] = useState('');
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Multi-note mode state
  const [selectedMultiNotes, setSelectedMultiNotes] = useState<string[]>([]);

  // Q&A state
  const [mode, setMode] = useState<TutorMode>('ask');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [runId, setRunId] = useState(0);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);

  // Sync default note if available
  useEffect(() => {
    if (notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(String(notes[0].id));
    }
  }, [notes, selectedNoteId]);

  // Build the active source payload
  const activeSources = useMemo((): { name: string; text: string }[] => {
    if (sourceType === 'lesson') {
      if (!selectedCourse || !selectedLesson) return [];
      const content = [
        `Course: ${selectedCourse.title} (${selectedCourse.level || 'All levels'}, Category: ${selectedCourse.cat})`,
        `Lesson: ${selectedLesson.title}`,
        '',
        'Lesson Questions, Practice, and Key Topics:',
        ...selectedLesson.items.map((item, i) => {
          const options = item.k === 'm' ? ` Other options: ${item.d.join(', ')}` : '';
          return `${i + 1}. Question: ${item.q}\nCorrect Answer: ${item.a}${options}`;
        }),
      ].join('\n');
      return [{ name: `${selectedCourse.title}: ${selectedLesson.title}`, text: content }];
    }

    if (sourceType === 'document') {
      if (uploadedDoc) {
        return [uploadedDoc];
      }
      const chosenNote = notes.find((n) => String(n.id) === selectedNoteId);
      if (chosenNote && chosenNote.text.trim()) {
        return [{ name: chosenNote.title, text: chosenNote.text }];
      }
      return [];
    }

    // 'notes' (multi-source)
    return selectedMultiNotes
      .map((id) => notes.find((n) => String(n.id) === id))
      .filter((n): n is Note => Boolean(n && n.text.trim()))
      .map((n) => ({ name: n.title, text: n.text }));
  }, [sourceType, selectedCourse, selectedLesson, uploadedDoc, notes, selectedNoteId, selectedMultiNotes]);

  const activeSourceName = useMemo(() => {
    if (sourceType === 'lesson') {
      return selectedCourse && selectedLesson ? `${selectedCourse.title} · ${selectedLesson.title}` : 'Selected Lesson';
    }
    if (sourceType === 'document') {
      if (uploadedDoc) return `Document: ${uploadedDoc.name}`;
      const chosenNote = notes.find((n) => String(n.id) === selectedNoteId);
      return chosenNote ? `Note: ${chosenNote.title}` : 'Select a document or note';
    }
    return `${selectedMultiNotes.length} notes selected`;
  }, [sourceType, selectedCourse, selectedLesson, uploadedDoc, notes, selectedNoteId, selectedMultiNotes]);

  // Handle document upload
  const handleDocUpload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    setIsUploadingDoc(true);
    setUploadDocStatus(`Analyzing ${file.name}…`);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      let text = '';
      if (ocrResponse.ok) {
        const ocrData = (await ocrResponse.json()) as { text?: string };
        text = ocrData.text || '';
      } else {
        text = await file.text().catch(() => '');
      }

      const extracted = text.trim() || `Document: ${file.name}`;
      setUploadedDoc({ name: file.name, text: extracted });
      setUploadDocStatus('');
      triggerFeedback('success');
    } catch (err) {
      console.error('Doc upload failed:', err);
      setUploadDocStatus('Could not read document.');
      setTimeout(() => setUploadDocStatus(''), 4000);
    } finally {
      setIsUploadingDoc(false);
      if (docFileInputRef.current) docFileInputRef.current.value = '';
    }
  };

  // Voice question input via mic
  const handleMicToggle = () => {
    toggleMic(
      dialect,
      (text) => {
        if (text) {
          setQuestion((prev) => (prev ? `${prev} ${text}` : text));
        }
      },
      (err) => {
        console.warn('Voice input error:', err);
      },
    );
  };

  // Run Tutor Query
  const runQuery = useCallback(async (customQuestion?: string) => {
    const q = customQuestion ?? question;
    if (!activeSources.length) {
      setError('Please select a lesson or document first.');
      return;
    }
    if (mode === 'ask' && !q.trim()) {
      setError('Please type or speak a question to ask.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setRunId((v) => v + 1);
    triggerFeedback('chip');

    try {
      const response = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          sources: activeSources,
          language: dialect,
          question: mode === 'ask' ? q.trim().slice(0, MAX_QUESTION_CHARS) : undefined,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { answer?: string; items?: QuizItem[]; provider?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? 'The tutor could not answer right now.');
      }

      if (mode === 'lesson') {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!items.length) throw new Error('The tutor could not build a quiz from this source.');
        setResult({ kind: 'quiz', items, provider: data?.provider ?? 'AI', sourceName: activeSourceName });
      } else {
        const answer = typeof data?.answer === 'string' ? data.answer.trim() : '';
        if (!answer) throw new Error('The tutor came back empty. Please try again.');
        setResult({
          kind: 'text',
          mode,
          answer,
          provider: data?.provider ?? 'AI',
          sourceName: activeSourceName,
        });
      }
      triggerFeedback('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The tutor could not answer right now.');
    } finally {
      setLoading(false);
    }
  }, [activeSources, mode, question, dialect, activeSourceName]);

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm dark:border-white/10 dark:bg-navy-2">
      {/* Hidden file input for document uploading */}
      <input
        ref={docFileInputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => void handleDocUpload(e.target.files)}
      />

      {/* Tutor Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-navy via-navy-2 to-navy px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-sun shadow-xs">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-[18px] font-extrabold leading-tight text-white">{t('AI Study Tutor')}</h2>
            <p className="text-[12.5px] text-white/80">
              {t('Ask questions about lessons or uploaded documents with voice & text responses')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sun">
            {languageName(dialect)}
          </span>
        </div>
      </header>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid gap-6 p-5 lg:grid-cols-12 lg:p-6">
        {/* Left Column: Source Selection + Question / Action Controls (lg:col-span-6) */}
        <div className="flex flex-col gap-4 lg:col-span-6">
          {/* Step 1: Select Source Type */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. {t('Choose Study Source')}
              </span>
              <span className="text-xs font-semibold text-navy dark:text-sun">
                {activeSourceName}
              </span>
            </div>

            {/* Source Type Pills */}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setSourceType('lesson');
                  triggerFeedback('chip');
                }}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                  sourceType === 'lesson'
                    ? 'bg-sun text-navy shadow-xs'
                    : 'border border-line bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-navy dark:text-slate-300'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>{t('Course Lesson')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceType('document');
                  triggerFeedback('chip');
                }}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                  sourceType === 'document'
                    ? 'bg-sun text-navy shadow-xs'
                    : 'border border-line bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-navy dark:text-slate-300'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{t('Uploaded Document')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceType('notes');
                  triggerFeedback('chip');
                }}
                className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                  sourceType === 'notes'
                    ? 'bg-sun text-navy shadow-xs'
                    : 'border border-line bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-navy dark:text-slate-300'
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" />
                <span>{t('My Notes')}</span>
              </button>
            </div>

            {/* Sub-selectors depending on Source Type */}
            {sourceType === 'lesson' && (
              <div className="mt-3 space-y-2 rounded-2xl border border-line bg-slate-50/70 p-3 dark:border-white/10 dark:bg-navy/60">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('Select Course')}</span>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                        setSelectedLessonIndex(0);
                      }}
                      className="mt-1 h-10 w-full truncate rounded-xl border border-line bg-white px-3 text-xs font-semibold text-slate-800 shadow-xs focus:border-navy focus:outline-none dark:border-white/15 dark:bg-navy-2 dark:text-white"
                    >
                      {allCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.level || c.cat})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('Select Lesson')}</span>
                    <select
                      value={selectedLessonIndex}
                      onChange={(e) => setSelectedLessonIndex(Number(e.target.value))}
                      className="mt-1 h-10 w-full truncate rounded-xl border border-line bg-white px-3 text-xs font-semibold text-slate-800 shadow-xs focus:border-navy focus:outline-none dark:border-white/15 dark:bg-navy-2 dark:text-white"
                    >
                      {selectedCourse?.lessons?.map((les, idx) => (
                        <option key={idx} value={idx}>
                          {idx + 1}. {les.title} ({les.items.length} prompts)
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}

            {sourceType === 'document' && (
              <div className="mt-3 space-y-2.5 rounded-2xl border border-line bg-slate-50/70 p-3 dark:border-white/10 dark:bg-navy/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {uploadedDoc ? `Attached: ${uploadedDoc.name}` : t('Choose a document or upload a file:')}
                  </span>
                  <button
                    type="button"
                    onClick={() => docFileInputRef.current?.click()}
                    disabled={isUploadingDoc}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-navy-2 disabled:opacity-50"
                  >
                    {isUploadingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>{t('Upload File (PDF/Word/Text)')}</span>
                  </button>
                </div>

                {isUploadingDoc && (
                  <p className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{uploadDocStatus || 'Processing document with OCR…'}</span>
                  </p>
                )}

                {uploadedDoc && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <span className="truncate">📄 {uploadedDoc.name} ({Math.round(uploadedDoc.text.length / 5)} words)</span>
                    <button
                      type="button"
                      onClick={() => setUploadedDoc(null)}
                      className="ml-2 text-emerald-700 hover:text-red-600 dark:text-emerald-400"
                      title="Remove uploaded document"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {!uploadedDoc && notes.length > 0 && (
                  <label className="block pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('Or pick from saved notes:')}</span>
                    <select
                      value={selectedNoteId}
                      onChange={(e) => setSelectedNoteId(e.target.value)}
                      className="mt-1 h-10 w-full truncate rounded-xl border border-line bg-white px-3 text-xs font-semibold text-slate-800 shadow-xs focus:border-navy focus:outline-none dark:border-white/15 dark:bg-navy-2 dark:text-white"
                    >
                      {notes.map((n) => (
                        <option key={n.id} value={String(n.id)}>
                          {n.title} ({n.subject})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            {sourceType === 'notes' && (
              <div className="mt-3 rounded-2xl border border-line bg-slate-50/70 p-3 dark:border-white/10 dark:bg-navy/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {t('Select notes to study together')} ({selectedMultiNotes.length}/{MAX_SOURCES}):
                </span>
                <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
                  {notes.map((n) => {
                    const id = String(n.id);
                    const isSelected = selectedMultiNotes.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setSelectedMultiNotes((prev) =>
                            isSelected ? prev.filter((item) => item !== id) : [...prev, id],
                          );
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-navy text-white'
                            : 'border border-line bg-white text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-navy-2 dark:text-slate-200'
                        }`}
                      >
                        {isSelected ? <Check className="h-3 w-3 text-sun" /> : null}
                        <span className="truncate max-w-[160px]">{n.title}</span>
                      </button>
                    );
                  })}
                  {notes.length === 0 && (
                    <p className="text-xs text-slate-500">{t('No saved notes yet. Create or upload notes below.')}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Choose Action / Mode */}
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. {t('Select Learning Goal')}
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                const isCurrent = mode === action.mode;
                return (
                  <button
                    key={action.mode}
                    type="button"
                    onClick={() => {
                      setMode(action.mode);
                      triggerFeedback('chip');
                    }}
                    className={`flex items-start gap-2.5 rounded-2xl border p-3 text-left transition-all ${
                      isCurrent
                        ? 'border-navy bg-navy/5 shadow-xs dark:border-sun dark:bg-sun/10'
                        : 'border-line bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-navy-2 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${isCurrent ? 'text-navy dark:text-sun' : 'text-slate-400'}`}
                    />
                    <div className="min-w-0">
                      <b className="block text-xs font-bold text-navy dark:text-white">{t(action.label)}</b>
                      <span className="mt-0.5 block text-[11px] leading-tight text-slate-500 dark:text-slate-400 truncate">
                        {t(action.hint)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Question Input (with Voice Mic) */}
          {mode === 'ask' && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3. {t('Your Question')}
                </span>
                <button
                  type="button"
                  onClick={handleMicToggle}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                    recording
                      ? 'animate-pulse bg-red-600 text-white'
                      : 'bg-sun/20 text-navy hover:bg-sun dark:text-sun dark:hover:text-navy'
                  }`}
                  title="Speak your question using microphone"
                >
                  <Mic className="h-3 w-3" />
                  <span>{recording ? t('Listening…') : sttProcessing ? t('Transcribing…') : t('Voice Input')}</span>
                </button>
              </div>

              <div className="relative mt-2">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_CHARS))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      void runQuery();
                    }
                  }}
                  rows={3}
                  placeholder={t('Type or speak your question about this lesson or document...')}
                  className="w-full rounded-2xl border border-line bg-white p-3 pr-10 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-navy focus:outline-none dark:border-white/15 dark:bg-navy dark:text-white"
                />
                {question.trim() && (
                  <button
                    type="button"
                    onClick={() => setQuestion('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    title="Clear question"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Suggestion Chips */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setQuestion(sug);
                      void runQuery(sug);
                    }}
                    className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-sun hover:text-navy dark:border-white/10 dark:bg-navy dark:text-slate-300 dark:hover:border-sun"
                  >
                    💡 {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="mt-2 flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => void runQuery()}
              disabled={loading || !activeSources.length || (mode === 'ask' && !question.trim())}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sun px-6 text-sm font-bold text-navy shadow-sm transition hover:bg-sun-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('Thinking & Preparing Answer…')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {mode === 'ask'
                      ? t('Ask Question')
                      : mode === 'summary'
                        ? t('Generate Summary')
                        : mode === 'guide'
                          ? t('Generate Study Guide')
                          : t('Start Quiz')}
                  </span>
                </>
              )}
            </button>

            {/* Auto Read Aloud Toggle */}
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-navy dark:text-slate-200">
              <input
                type="checkbox"
                checked={autoPlayAudio}
                onChange={(e) => setAutoPlayAudio(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-sun focus:ring-sun"
              />
              <span className="flex items-center gap-1">
                <Volume2 className="h-3.5 w-3.5 text-sun" />
                <span>{t('Auto-play Audio')}</span>
              </span>
            </label>
          </div>
        </div>

        {/* Right Column: Interactive Response Area with Text & Audio (lg:col-span-6) */}
        <div className="flex min-h-[360px] flex-col rounded-2xl border border-line/80 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-navy/70 lg:col-span-6">
          {loading ? (
            <div className="my-auto space-y-4 p-4 text-center" role="status">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-sun" />
              <p className="text-sm font-bold text-navy dark:text-white">
                {t('Sautika AI is reviewing')} {activeSourceName}…
              </p>
              <div className="mx-auto max-w-sm space-y-2">
                <span className="block h-2.5 rounded-full bg-slate-200 animate-pulse dark:bg-white/10" />
                <span className="block h-2.5 rounded-full bg-slate-200 animate-pulse dark:bg-white/10" style={{ width: '80%' }} />
                <span className="block h-2.5 rounded-full bg-slate-200 animate-pulse dark:bg-white/10" style={{ width: '92%' }} />
              </div>
            </div>
          ) : error ? (
            <div className="my-auto rounded-2xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-900/50 dark:bg-red-950/30">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => void runQuery()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-900 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200"
              >
                <RotateCcw className="h-3.5 w-3.5" /> {t('Try Again')}
              </button>
            </div>
          ) : result?.kind === 'quiz' ? (
            <QuizPlayer items={result.items} onNewQuiz={() => void runQuery()} />
          ) : result?.kind === 'text' ? (
            <TextAnswerWithAudio
              answer={result.answer}
              provider={result.provider}
              language={dialect}
              sourceName={result.sourceName}
              autoPlay={autoPlayAudio}
              onSave={() =>
                onSaveAsNote({
                  title: `${result.mode === 'ask' ? 'Q&A' : result.mode === 'summary' ? 'Summary' : 'Study Guide'}: ${result.sourceName}`.slice(0, 120),
                  text: result.answer,
                })
              }
            />
          ) : (
            <div className="my-auto flex flex-col items-center justify-center p-6 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sun/20 text-sun">
                <Sparkles className="h-6 w-6" />
              </span>
              <h3 className="mt-3 text-[16px] font-extrabold text-navy dark:text-white">
                {t('Your Tutor is Ready')}
              </h3>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {t('Select any course lesson or uploaded document, then ask a question or generate a study guide. Answers will appear with full text & interactive audio.')}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuestion('What are the key points in this lesson?');
                    void runQuery('What are the key points in this lesson?');
                  }}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-navy shadow-xs hover:bg-sun transition-colors dark:bg-navy-2 dark:text-white"
                >
                  🚀 {t('Ask Key Points')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('summary');
                    void runQuery();
                  }}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-navy shadow-xs hover:bg-sun transition-colors dark:bg-navy-2 dark:text-white"
                >
                  📝 {t('Generate Summary')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * TextAnswerWithAudio:
 * Displays tutor text answer alongside comprehensive audio controls:
 * - Play / Pause / Resume / Stop
 * - Animated Audio Equalizer Waveform
 * - Speed Adjustment (1x, 1.25x, 0.85x)
 * - Save as Note button
 * - Copy button
 */
function TextAnswerWithAudio({
  answer,
  provider,
  language,
  sourceName,
  autoPlay = false,
  onSave,
}: {
  answer: string;
  provider: string;
  language: VoiceLang;
  sourceName: string;
  autoPlay?: boolean;
  onSave: () => void;
}) {
  const t = useUITranslation();
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [speed, setSpeed] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop playback cleanly
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // Audio Playback Engine
  const startAudio = useCallback(async () => {
    stopAudio();
    const cleanText = stripCitations(answer);
    if (!cleanText) return;

    setStatus('playing');

    // 1. Try Sunbird TTS if language is supported
    if (hasSunbirdTts(language)) {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText.slice(0, 500),
            language,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as { audioUrl?: string };
          if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            audio.playbackRate = speed;
            audioRef.current = audio;
            audio.onended = () => setStatus('idle');
            audio.onerror = () => setStatus('idle');
            await audio.play();
            return;
          }
        }
      } catch {
        // Fallback to browser Web Speech API
      }
    }

    // 2. Web Speech Synthesis API Fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = speed;
      utterance.onend = () => setStatus('idle');
      utterance.onerror = () => setStatus('idle');
      window.speechSynthesis.speak(utterance);
    } else {
      setStatus('idle');
    }
  }, [answer, language, speed, stopAudio]);

  // Autoplay if requested
  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => {
        void startAudio();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, startAudio]);

  const handlePauseResume = () => {
    if (status === 'playing') {
      if (audioRef.current) {
        audioRef.current.pause();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      setStatus('paused');
    } else if (status === 'paused') {
      if (audioRef.current) {
        void audioRef.current.play();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
      setStatus('playing');
    }
  };

  const toggleSpeed = () => {
    const nextSpeed = speed === 1 ? 1.25 : speed === 1.25 ? 0.85 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const copyAnswer = () => {
    void navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div>
        {/* Source attribution header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2.5 dark:border-white/10">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {t('Source')}: <b className="text-navy dark:text-sun">{sourceName}</b>
          </span>
          <span className="text-[10.5px] uppercase tracking-wider text-slate-400">{provider}</span>
        </div>

        {/* Audio Player Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sun/50 bg-sun/10 p-2.5 dark:border-sun/30 dark:bg-sun/5">
          <div className="flex items-center gap-2">
            {status === 'idle' ? (
              <button
                type="button"
                onClick={() => void startAudio()}
                className="flex items-center gap-1.5 rounded-full bg-sun px-3.5 py-1.5 text-xs font-bold text-navy shadow-xs transition hover:bg-sun-dark active:scale-95"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>{t('Listen to Answer')}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="grid h-8 w-8 place-items-center rounded-full bg-sun text-navy hover:bg-sun-dark"
                  title={status === 'paused' ? 'Resume' : 'Pause'}
                >
                  {status === 'paused' ? <Play className="h-3.5 w-3.5 fill-navy" /> : <Pause className="h-3.5 w-3.5 fill-navy" />}
                </button>
                <button
                  type="button"
                  onClick={stopAudio}
                  className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-600 hover:text-red-600 dark:bg-navy-2 dark:text-slate-300"
                  title="Stop"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
              </div>
            )}

            {/* Equalizer Waveform animation */}
            <div className="flex items-end gap-0.5 h-3.5 px-1 text-sun" aria-hidden="true">
              <span className={`w-1 rounded-full bg-sun ${status === 'playing' ? 'h-3 animate-pulse' : 'h-1.5'}`} />
              <span className={`w-1 rounded-full bg-sun ${status === 'playing' ? 'h-3.5 animate-bounce' : 'h-2'}`} style={{ animationDuration: '600ms' }} />
              <span className={`w-1 rounded-full bg-sun ${status === 'playing' ? 'h-2 animate-pulse' : 'h-1'}`} style={{ animationDuration: '800ms' }} />
            </div>

            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              {status === 'playing' ? t('Speaking in') + ` ${languageName(language)}` : status === 'paused' ? t('Paused') : t('Audio Ready')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSpeed}
              className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 shadow-xs hover:bg-slate-100 dark:bg-navy-2 dark:text-slate-200"
              title="Playback speed"
            >
              {speed}x
            </button>
          </div>
        </div>

        {/* Text Answer */}
        <div className="mt-4 max-h-[340px] overflow-y-auto pr-1">
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800 dark:text-slate-100">
            {withCitations(answer)}
          </p>
        </div>
      </div>

      {/* Answer Bottom Actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-navy-2 active:scale-95 dark:bg-sun dark:text-navy"
          >
            <NotebookPen className="h-3.5 w-3.5" />
            <span>{t('Save as Note (+5 Coins)')}</span>
          </button>

          <button
            type="button"
            onClick={copyAnswer}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-navy-2 dark:text-slate-200"
          >
            {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? t('Copied!') : t('Copy')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * QuizPlayer:
 * 5-Question interactive quiz player generated from lesson or document
 */
function QuizPlayer({ items, onNewQuiz }: { items: QuizItem[]; onNewQuiz: () => void }) {
  const t = useUITranslation();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const current = items[Math.min(index, items.length - 1)];
  const options = useMemo(() => {
    return [current.a, ...current.d].sort(() => 0.5 - Math.random());
  }, [current]);

  const choose = (option: string) => {
    if (picked) return;
    setPicked(option);
    if (option === current.a) {
      setScore((s) => s + 1);
      triggerFeedback('success');
    } else {
      triggerFeedback('chip');
    }
  };

  const nextQuestion = () => {
    if (index + 1 >= items.length) {
      setDone(true);
      return;
    }
    setIndex((v) => v + 1);
    setPicked(null);
  };

  if (done) {
    return (
      <div className="my-auto flex flex-col items-center justify-center p-6 text-center">
        <span className="text-4xl">🎉</span>
        <h3 className="mt-2 text-lg font-extrabold text-navy dark:text-white">
          {t('Quiz Completed!')}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t('You scored')} <b className="text-navy dark:text-sun">{score}</b> / {items.length}
        </p>
        <button
          type="button"
          onClick={onNewQuiz}
          className="mt-4 rounded-xl bg-sun px-5 py-2 text-xs font-bold text-navy shadow-xs hover:bg-sun-dark"
        >
          {t('Generate Another Quiz')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-line/60 pb-2 text-xs font-bold text-slate-500 dark:border-white/10 dark:text-slate-400">
          <span>{t('Question')} {index + 1} of {items.length}</span>
          <span className="text-navy dark:text-sun">{t('Score')}: {score}</span>
        </div>

        <h4 className="mt-3 text-[15px] font-bold leading-snug text-slate-900 dark:text-white">
          {current.q}
        </h4>

        <div className="mt-4 space-y-2">
          {options.map((opt) => {
            const isSelected = picked === opt;
            const isCorrect = opt === current.a;
            let btnClass = 'border-line bg-white text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-navy-2 dark:text-white';
            if (picked) {
              if (isCorrect) {
                btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold dark:bg-emerald-950/60 dark:text-emerald-200';
              } else if (isSelected) {
                btnClass = 'border-red-400 bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-200';
              }
            }

            return (
              <button
                key={opt}
                type="button"
                disabled={Boolean(picked)}
                onClick={() => choose(opt)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs font-semibold transition-all ${btnClass}`}
              >
                <span>{opt}</span>
                {picked && isCorrect && <Check className="h-4 w-4 text-emerald-600" />}
              </button>
            );
          })}
        </div>

        {picked && current.e && (
          <p className="mt-3 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            💡 {current.e}
          </p>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!picked}
          onClick={nextQuestion}
          className="rounded-xl bg-navy px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-navy-2 disabled:opacity-40 dark:bg-sun dark:text-navy"
        >
          {index + 1 >= items.length ? t('Finish Quiz') : t('Next Question')} →
        </button>
      </div>
    </div>
  );
}

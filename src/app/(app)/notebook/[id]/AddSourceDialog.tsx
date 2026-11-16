'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FileUp, Globe, Loader2, Type, X } from 'lucide-react';
import { addSource, uploadFile } from '@/lib/notebooks/client';
import { useUITranslation } from '@/lib/useUITranslation';

type Tab = 'upload' | 'text' | 'url';

/** The types `/api/ocr` and the ingestion pipeline can actually read. */
const ACCEPT = [
  '.pdf', '.docx', '.txt', '.md', '.csv', '.json',
  '.png', '.jpg', '.jpeg', '.webp',
  'image/*', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',');

interface Props {
  notebookId: string;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * Adds one source. Uploads go straight to R2 through a presigned URL, so a
 * large PDF never streams through a serverless function.
 */
export default function AddSourceDialog({ notebookId, onClose, onAdded }: Props) {
  const t = useUITranslation();
  const [tab, setTab] = useState<Tab>('upload');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, busy]);

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) return;
    setError('');

    try {
      // One at a time, so a failure names the file it belongs to.
      for (const file of Array.from(files)) {
        setBusy(`${t('Uploading')} ${file.name}…`);
        const { r2Key, kind } = await uploadFile(notebookId, file);
        setBusy(`${t('Adding')} ${file.name}…`);
        await addSource({
          notebookId,
          kind,
          title: file.name.replace(/\.[^/.]+$/, ''),
          r2Key,
        });
      }
      onAdded();
      onClose();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t('Could not add that source.'));
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submitText = async (): Promise<void> => {
    if (!text.trim()) return;
    setBusy(t('Adding your text…'));
    setError('');
    try {
      await addSource({
        notebookId,
        kind: 'text',
        title: title.trim() || text.trim().split('\n', 1)[0].slice(0, 60),
        text,
      });
      onAdded();
      onClose();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : t('Could not add that source.'));
      setBusy('');
    }
  };

  const submitUrl = async (): Promise<void> => {
    if (!url.trim()) return;
    setBusy(t('Fetching the page…'));
    setError('');
    try {
      await addSource({
        notebookId,
        kind: 'url',
        title: title.trim() || url.trim(),
        url: url.trim(),
      });
      onAdded();
      onClose();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : t('Could not add that source.'));
      setBusy('');
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof FileUp }[] = [
    { id: 'upload', label: t('Upload'), icon: FileUp },
    { id: 'text', label: t('Paste text'), icon: Type },
    { id: 'url', label: t('Web page'), icon: Globe },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-source-title"
      className="fixed inset-0 z-50 grid place-items-end bg-navy/50 p-0 sm:place-items-center sm:p-4"
    >
      <div className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2
            id="add-source-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-[20px] font-extrabold text-navy focus:outline-none"
          >
            {t('Add sources')}
          </h2>
          <button
            type="button"
            aria-label={t('Close')}
            onClick={onClose}
            disabled={Boolean(busy)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-mist disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
          {t('The tutor answers only from the sources in this notebook.')}
        </p>

        <div role="tablist" aria-label={t('How to add a source')} className="mt-4 flex gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line text-[13px] font-bold text-slate-600 transition aria-selected:border-navy aria-selected:bg-sun aria-selected:text-navy"
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === 'upload' ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={(event) => void handleFiles(event.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={Boolean(busy)}
                className="flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-paper px-4 py-6 text-center transition hover:border-sun disabled:opacity-60"
              >
                <FileUp className="h-7 w-7 text-navy" aria-hidden />
                <span className="text-[14px] font-bold text-navy">{t('Choose files')}</span>
                <span className="text-[12.5px] leading-relaxed text-slate-500">
                  {t('PDF, Word, text or a photo of your notes. Up to 10 MB each.')}
                </span>
              </button>
              <p className="mt-2 text-[12px] text-slate-500">
                {t('On a phone, Choose files lets you take a photo of your book.')}
              </p>
            </>
          ) : null}

          {tab === 'text' ? (
            <>
              <label htmlFor="source-title" className="block text-[13px] font-bold text-navy">
                {t('Title')}
              </label>
              <input
                id="source-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('For example: Photosynthesis notes')}
                className="mt-1.5 h-12 w-full rounded-xl border border-line px-4 text-[14px] text-ink focus:border-navy focus:outline-none"
              />
              <label htmlFor="source-text" className="mt-3 block text-[13px] font-bold text-navy">
                {t('Your text')}
              </label>
              <textarea
                id="source-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={7}
                placeholder={t('Paste or type your notes here…')}
                className="mt-1.5 w-full rounded-xl border border-line p-4 text-[14px] leading-relaxed text-ink focus:border-navy focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void submitText()}
                disabled={Boolean(busy) || !text.trim()}
                className="mt-3 h-12 w-full rounded-xl bg-sun text-[15px] font-bold text-navy transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? t('Adding…') : t('Add this text')}
              </button>
            </>
          ) : null}

          {tab === 'url' ? (
            <>
              <label htmlFor="source-url" className="block text-[13px] font-bold text-navy">
                {t('Web address')}
              </label>
              <input
                id="source-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://"
                className="mt-1.5 h-12 w-full rounded-xl border border-line px-4 text-[14px] text-ink focus:border-navy focus:outline-none"
              />
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
                {t('We read the words on the page. Pages that need a login will not work.')}
              </p>
              <button
                type="button"
                onClick={() => void submitUrl()}
                disabled={Boolean(busy) || !url.trim()}
                className="mt-3 h-12 w-full rounded-xl bg-sun text-[15px] font-bold text-navy transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? t('Adding…') : t('Add this page')}
              </button>
            </>
          ) : null}
        </div>

        {busy ? (
          <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-mist px-4 py-3 text-[13px] font-semibold text-navy">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {busy}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignIn } from '@clerk/nextjs';
import { AlertTriangle, ArrowLeft, Eye, EyeOff, Loader2, Mail } from 'lucide-react';

/**
 * Resetting a forgotten password.
 *
 * Three steps, following Clerk's reset flow: start a sign-in with the email,
 * send a code to it, then verify the code and set the new password. A learner
 * who has forgotten their password previously had no way back into the app at
 * all.
 */

type Step = 'email' | 'code' | 'done';

export default function ForgotPassword() {
  const router = useRouter();
  const { signIn } = useSignIn();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async (): Promise<void> => {
    if (!signIn || !email.trim()) return;
    setBusy(true);
    setError('');

    try {
      // The sign-in has to exist before a reset code can be sent to it.
      const { error: createError } = await signIn.create({ identifier: email.trim() });
      if (createError) {
        setError(createError.message);
        return;
      }

      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError(sendError.message);
        return;
      }
      setStep('code');
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'We could not send the code. Check the address and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const submitNewPassword = async (): Promise<void> => {
    if (!signIn || !code.trim() || password.length < 8) return;
    setBusy(true);
    setError('');

    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({
        code: code.trim(),
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({
        password,
      });
      if (submitError) {
        setError(submitError.message);
        return;
      }

      // The sign-in is complete, so finish it and go straight in.
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) {
        // The password did change, so say so rather than showing a failure.
        setStep('done');
        return;
      }
      router.push('/home');
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'We could not change the password. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid min-h-screen place-items-center bg-paper px-5 py-12">
      <div className="w-full max-w-[420px]">
        <Link
          href="/sign-in"
          className="inline-flex h-11 items-center gap-1.5 text-[13px] font-bold text-navy hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
        </Link>

        <div className="mt-3 rounded-2xl border border-line bg-white p-6">
          <h1 className="text-[22px] font-extrabold text-navy">Reset your password</h1>

          {step === 'email' ? (
            <>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">
                Type the email address you signed up with. We will send you a code.
              </p>

              <label htmlFor="reset-email" className="mt-4 block text-[12px] font-bold text-navy">
                Email address
              </label>
              <div className="relative mt-1.5">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <input
                  id="reset-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void sendCode();
                  }}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-line bg-paper pl-10 pr-4 text-[14px] text-ink focus:border-navy focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={busy || !email.trim()}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sun text-[15px] font-bold text-navy transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Send me a code
              </button>
            </>
          ) : null}

          {step === 'code' ? (
            <>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">
                We sent a code to <strong className="font-bold text-navy">{email}</strong>. Type it
                below with your new password.
              </p>

              <label htmlFor="reset-code" className="mt-4 block text-[12px] font-bold text-navy">
                Code from the email
              </label>
              <input
                id="reset-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="123456"
                className="mt-1.5 h-12 w-full rounded-xl border border-line bg-paper px-4 text-[15px] tracking-[0.2em] text-ink focus:border-navy focus:bg-white focus:outline-none"
              />

              <label htmlFor="reset-password" className="mt-3 block text-[12px] font-bold text-navy">
                New password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void submitNewPassword();
                  }}
                  placeholder="At least 8 characters"
                  className="h-12 w-full rounded-xl border border-line bg-paper pl-4 pr-11 text-[14px] text-ink focus:border-navy focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => void submitNewPassword()}
                disabled={busy || !code.trim() || password.length < 8}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sun text-[15px] font-bold text-navy transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Set my new password
              </button>

              <button
                type="button"
                onClick={() => void sendCode()}
                disabled={busy}
                className="mt-2 h-11 w-full rounded-xl border border-line bg-white text-[13px] font-semibold text-navy transition hover:bg-mist disabled:opacity-50"
              >
                Send the code again
              </button>
            </>
          ) : null}

          {step === 'done' ? (
            <>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">
                Your password has been changed. Sign in with the new one.
              </p>
              <Link
                href="/sign-in"
                className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-sun text-[15px] font-bold text-navy"
              >
                Go to sign in
              </Link>
            </>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-900"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

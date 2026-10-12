'use client';

import Link from 'next/link';
import { ArrowRight, UserRound } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs';
import { Logo } from '@/components/Icons';

const EDUCATION_LEVELS = [
  'Baby Class',
  'Middle Class',
  'Top Class',
  'P.1',
  'P.2',
  'P.3',
  'P.4',
  'P.5',
  'P.6',
  'P.7',
  'S.1',
  'S.2',
  'S.3',
  'S.4',
  'S.5',
  'S.6',
] as const;

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  contact: '',
  education: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterPage() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const isSubmitting = fetchStatus === 'fetching';

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError('');
  }

  async function finishRegistration() {
    const { error: finalizeError } = await signUp.finalize();
    if (finalizeError) {
      setError(finalizeError.message);
      return;
    }
    router.replace('/home');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please re-enter them carefully.');
      return;
    }

    setError('');
    try {
      const { error: signUpError } = await signUp.password({
        emailAddress: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        unsafeMetadata: {
          contact: form.contact,
          education: form.education,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (signUp.status === 'complete') {
        await finishRegistration();
      } else if (signUp.unverifiedFields.includes('email_address')) {
        const { error: verificationError } = await signUp.verifications.sendEmailCode();
        if (verificationError) {
          setError(verificationError.message);
        } else {
          setIsVerifyingEmail(true);
        }
      } else {
        setError('Registration could not be completed. Check that your Clerk sign-up settings allow email and password registration.');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Registration failed. Please try again.');
    }
  }

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      const { error: verificationError } = await signUp.verifications.verifyEmailCode({ code: verificationCode });
      if (verificationError) {
        setError(verificationError.message);
      } else if (signUp.status === 'complete') {
        await finishRegistration();
      } else {
        setError('Email verified, but registration still needs another step. Check the required fields in your Clerk settings.');
      }
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Email verification failed. Please try again.');
    }
  }

  const inputClassName = 'mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[14px] font-normal text-ink outline-none placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/15';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff5d2_0%,_#f2f6fb_25%,_#edf4ff_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-navy transition-opacity hover:opacity-80">
            <Logo dark size="md" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-navy shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50">
            Back to Home
          </Link>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(0,23,49,0.12)]">
          <div className="flex items-center justify-center border-b border-slate-200 bg-navy px-6 py-6 text-center text-white">
            <div>
              <div className="flex items-center justify-center">
                <Logo />
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-sun">Registration</p>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <div className="text-center">
              <h1 className="font-display text-[28px] font-bold tracking-tight text-navy sm:text-[32px]">SAUTIKA REGISTRATION FORM</h1>
              <p className="mt-2 text-sm text-slate-500">Build your account and begin your learning journey with confidence.</p>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            {isVerifyingEmail ? (
              <form onSubmit={handleVerifyEmail} className="mt-8 space-y-6">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Email verification code
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    name="verificationCode"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    className={inputClassName}
                    placeholder="Enter the code sent to your email"
                    required
                  />
                </label>
                <p className="text-sm text-slate-500">Check your inbox for a verification code from Clerk.</p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full min-h-[54px] items-center justify-center gap-3 rounded-full bg-sun px-6 text-[14px] font-semibold text-ink shadow-lg shadow-sun/20 transition-colors hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Verifying…' : 'Verify Email and Finish Registration'} <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  First Name
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="Enter first name"
                    required
                  />
                </label>

                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Last Name
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="Enter last name"
                    required
                  />
                </label>

                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Email
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Contact
                  <input
                    type="tel"
                    name="contact"
                    autoComplete="tel"
                    value={form.contact}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="e.g. +256 700 000000"
                    required
                  />
                </label>
              </div>

              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                Level of Education
                <select
                  name="education"
                  value={form.education}
                  onChange={handleChange}
                  className={`${inputClassName} appearance-none`}
                  required
                >
                  <option value="" disabled>Select your class</option>
                  {EDUCATION_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Password
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                  />
                </label>

                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Confirm Password
                  <input
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={inputClassName}
                    placeholder="Re-enter password"
                    minLength={8}
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full min-h-[54px] items-center justify-center gap-3 rounded-full bg-sun px-6 text-[14px] font-semibold text-ink shadow-lg shadow-sun/20 transition-colors hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting…' : 'Finish Registration'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-slate-500">
              <UserRound className="h-4 w-4 text-sun-dark" />
              Already have an account?
              <Link href="/sign-in" className="font-semibold text-navy hover:text-sun-dark">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

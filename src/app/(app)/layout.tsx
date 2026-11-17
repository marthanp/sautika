import { auth } from '@clerk/nextjs/server';
import LearnerDataSync from '@/components/providers/LearnerDataSync';
import AppShell from '@/components/layout/AppShell';
import OnboardingGate from '@/components/onboarding/OnboardingGate';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();

  return (
    <LearnerDataSync>
      <AppShell>{children}</AppShell>
      {/* Decides for itself whether a first-time learner needs the tutorial. */}
      <OnboardingGate />
    </LearnerDataSync>
  );
}

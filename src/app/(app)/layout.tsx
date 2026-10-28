import { auth } from '@clerk/nextjs/server';
import LearnerDataSync from '@/components/LearnerDataSync';
import AppShell from '@/components/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();

  return (
    <LearnerDataSync>
      <AppShell>{children}</AppShell>
    </LearnerDataSync>
  );
}

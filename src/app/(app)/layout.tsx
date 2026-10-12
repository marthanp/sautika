import { auth } from '@clerk/nextjs/server';
import LearnerDataSync from '@/components/LearnerDataSync';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await auth.protect();

  return (
    <div className="min-h-screen lg:pl-72">
      <LearnerDataSync>
        <Sidebar />
        <Topbar />
        <main className="min-w-0 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
      </LearnerDataSync>
    </div>
  );
}

import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:pl-72">
      <Sidebar />
      <Topbar />
      <main className="min-w-0 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">{children}</main>
    </div>
  );
}

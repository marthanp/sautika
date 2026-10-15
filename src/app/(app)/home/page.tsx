import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Study Hub',
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1330px]">
      <h1 className="text-[32px] font-extrabold leading-tight sm:text-[40px]">Study Hub</h1>
    </div>
  );
}

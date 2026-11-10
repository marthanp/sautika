import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Features from '@/components/Features';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import SignIn from '@/components/SignIn';
import AmbientLanguageCanvas from '@/components/AmbientLanguageCanvas';
import FloatingDialectSelector from '@/components/FloatingDialectSelector';

export default async function Page() {
  const { userId } = await auth();
  if (userId) {
    redirect('/home');
  }

  return (
    <main className="relative">
      <AmbientLanguageCanvas />
      <Hero />
      <Features />
      <SignIn />
      <Footer />
      <FloatingDialectSelector />
    </main>
  );
}

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Features from '@/components/landing/Features';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/landing/Hero';
import SignIn from '@/components/auth/SignIn';
import AmbientLanguageCanvas from '@/components/voice/AmbientLanguageCanvas';
import FloatingDialectSelector from '@/components/voice/FloatingDialectSelector';

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

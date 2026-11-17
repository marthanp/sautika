import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import About from '@/components/landing/About';
import Features from '@/components/landing/Features';
import NotebookSection from '@/components/landing/NotebookSection';
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
      <NotebookSection />
      <About />
      <SignIn />
      <Footer />
      <FloatingDialectSelector />
    </main>
  );
}

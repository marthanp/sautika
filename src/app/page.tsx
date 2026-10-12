import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Features from '@/components/Features';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import SignIn from '@/components/SignIn';

export default async function Page() {
  const { userId } = await auth();
  if (userId) {
    redirect('/home');
  }

  return (
    <main>
      <Hero />
      <Features />
      <SignIn />
      <Footer />
    </main>
  );
}

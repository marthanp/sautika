import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import AccessibilitySync from '@/components/providers/AccessibilitySync';
import ServiceWorkerRegister from '@/components/providers/ServiceWorkerRegister';
import './globals.css';

const DESCRIPTION =
  'A voice-first AI tutor for East African learners. Ask in Luganda, Swahili, Acholi or English, turn your notes into quizzes and study guides, and keep the pages you have opened when the connection drops.';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-poppins' });

export const metadata: Metadata = {
  title: 'Sautika · Speak • Learn • Grow',
  description: DESCRIPTION,
  applicationName: 'Sautika',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'Sautika',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    siteName: 'Sautika',
    title: 'Sautika · Speak • Learn • Grow',
    description: DESCRIPTION,
    images: [{ url: '/images/hero.jpg', width: 1200, height: 630, alt: 'Learners studying with Sautika' }],
  },
};
export const viewport: Viewport = { themeColor: '#001731', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <ClerkProvider>
          <AccessibilitySync />
          <ServiceWorkerRegister />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
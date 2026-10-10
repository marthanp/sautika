import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-poppins' });

export const metadata: Metadata = {
  title: 'Sautika · Speak • Learn • Grow',
  description: 'A voice-first AI learning assistant for primary and secondary students in East Africa. Learn in your native language, even offline.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/Logo_symbol.png' },
};
export const viewport: Viewport = { themeColor: '#001731', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}

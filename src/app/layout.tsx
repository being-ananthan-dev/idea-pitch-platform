import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'IntelliPitch — IEEE SB MCET Idea Pitching Competition',
  description:
    'A secure, time-governed idea pitching competition platform by IEEE SB MCET. Showcase your innovation and compete for exciting prizes.',
  keywords: ['IntelliPitch', 'IEEE', 'MCET', 'idea pitching', 'competition'],
  openGraph: {
    title: 'IntelliPitch — IEEE SB MCET',
    description: 'Pitch your idea. Prove your vision.',
    type: 'website',
  },
};

import { ModalProvider } from '@/context/ModalContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#0A0F1E] text-white antialiased relative">
        {/* Global Ambient Background Orbs — GPU Composited */}
        <div className="fixed top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-700/15 blur-[80px] rounded-full pointer-events-none -z-10" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
        <div className="fixed top-[40%] right-[-10%] w-[400px] h-[400px] bg-purple-700/10 blur-[70px] rounded-full pointer-events-none -z-10" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
        <div className="fixed bottom-[10%] left-[-5%] w-[350px] h-[350px] bg-cyan-700/10 blur-[70px] rounded-full pointer-events-none -z-10" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />
        
        <AuthProvider>
          <ModalProvider>
            {children}
          </ModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

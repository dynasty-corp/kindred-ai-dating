import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { KindredThemeProvider } from '@/lib/theme';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KindredAI — Thoughtful AI-Guided Dating & Shared Experiences',
  description:
    'Warm, privacy-first Wingman onboarding, autonomous Agent Lounge introductions, 2-player co-op games, and consent-gated relationship simulations.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="alabaster"
      suppressHydrationWarning
      className={`${instrumentSerif.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen bg-[var(--surface-canvas)] text-[var(--ink-primary)] selection:bg-[var(--accent-coral)]/20 selection:text-[var(--ink-primary)]">
        <KindredThemeProvider>{children}</KindredThemeProvider>
      </body>
    </html>
  );
}

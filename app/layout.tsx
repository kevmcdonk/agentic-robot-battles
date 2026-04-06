import type { Metadata } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import AuthenticatedNavLoader from '@/components/AuthenticatedNavLoader';

export const metadata: Metadata = {
  title: 'Agentic Robot Battles',
  description: 'Build, validate, and battle AI-powered combat robots in the arena.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <SessionProvider>
          <AuthenticatedNavLoader />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

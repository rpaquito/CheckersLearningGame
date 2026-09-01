import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toast/ToastProvider';

export const metadata: Metadata = {
  title: 'Checkers Sensei',
  description: 'Checkers Sensei — placeholder layout, replaced in a later phase.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

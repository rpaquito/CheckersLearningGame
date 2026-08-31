import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Checkers Sensei',
  description: 'Checkers Sensei — placeholder layout, replaced in a later phase.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}

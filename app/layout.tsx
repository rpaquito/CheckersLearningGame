import type { Metadata } from 'next';
import { Bangers, Poppins } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast/ToastProvider';

// "Anime" visual identity (spec §8): Bangers for display/titles only
// (`font-display`, see globals.css), Poppins for everything else
// (`font-sans`, the default via body's font-family above). `latin-ext`
// alongside `latin` because all copy is PT-PT and needs the accented
// characters.
const bangers = Bangers({
  weight: '400',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-bangers',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Checkers Sensei',
  description:
    'Jogue às damas contra o computador ou com um amigo, com dicas para aprender a jogar melhor.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={`${bangers.variable} ${poppins.variable}`}>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

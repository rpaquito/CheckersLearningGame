import type { Metadata, Viewport } from 'next';
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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Checkers Sensei',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

// `viewportFit: 'cover'` is what makes `env(safe-area-inset-*)` (already
// used by components/PageChrome/PageChrome.tsx's MODAL_BACKDROP_CLASS)
// return real, non-zero values instead of always 0 -- without this export,
// no `viewport-fit=cover` meta tag exists at all, so that CSS has been
// silently inert since it was written. Visually a no-op on any device
// without a notch/Dynamic Island (ordinary browser tab or installed PWA on
// most Android/desktop devices); matters once Phase 10's native iOS shell
// exists.
export const viewport: Viewport = {
  themeColor: '#1A0B33',
  viewportFit: 'cover',
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

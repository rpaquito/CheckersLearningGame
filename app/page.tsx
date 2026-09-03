'use client';

import Link from 'next/link';
import { clearSavedGame } from '@/lib/checkers/useCheckersGame';
import { PageGlow, PageHeader, titleStroke } from '@/components/PageChrome/PageChrome';
import { BACKGROUND_THEMES } from '@/lib/settings/themes';
import { useSettings } from '@/lib/settings/useSettings';
import { useTranslation } from '@/lib/i18n/useTranslation';

// Same "stamped shadow + diagonal clip" visual language as ChipButton, at
// tile scale, for the four primary actions.
const TILE_CLASS =
  'relative flex items-center justify-center h-32 rounded-2xl px-6 overflow-hidden bg-cover bg-center ' +
  'shadow-[4px_4px_0_rgba(0,0,0,0.35)] [clip-path:polygon(0_0,100%_0,100%_88%,96%_100%,0_100%)] ' +
  'transition-transform hover:scale-[1.02]';

const TILE_LABEL_CLASS = 'relative z-10 text-lg font-bold text-center text-white';
const TILE_LABEL_STROKE = titleStroke(1);

interface TileData {
  href: string;
  image: string;
  gradient: string;
  emoji: string;
  label: string;
  onClick?: () => void;
}

function MenuTile({ href, image, gradient, emoji, label, onClick }: TileData) {
  return (
    <Link href={href} onClick={onClick} className={TILE_CLASS} style={{ backgroundImage: `url(${image})` }}>
      <span aria-hidden="true" className="absolute inset-0" style={{ background: gradient }} />
      <span aria-hidden="true" className="absolute top-3 right-4 text-base z-10">
        {emoji}
      </span>
      <span className={TILE_LABEL_CLASS} style={{ textShadow: TILE_LABEL_STROKE }}>
        {label}
      </span>
    </Link>
  );
}

export default function HomePage() {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const theme = BACKGROUND_THEMES[settings.backgroundTheme];

  // Real Draw Things art (Phase 10c) behind each tile, with the tile's own
  // accent gradient turned translucent and layered on top as a color tint --
  // ported from Chess Sensei's own app/page.tsx pattern -- so the tile keeps
  // its accent-color identity and the label stays legible regardless of the
  // photo underneath.
  const tiles: TileData[] = [
    {
      href: '/configurar',
      image: '/menu/vs-cpu.webp',
      gradient: 'linear-gradient(135deg, rgba(0,229,255,0.55), rgba(78,168,222,0.4))',
      emoji: '⚔️',
      label: t.menu.playVsComputer,
    },
    {
      href: '/jogar?mode=local',
      image: '/menu/two-players.webp',
      gradient: 'linear-gradient(135deg, rgba(255,154,194,0.55), rgba(255,111,165,0.4))',
      emoji: '✨',
      label: t.menu.twoPlayers,
      onClick: () => clearSavedGame(),
    },
    {
      href: '/aprender',
      image: '/menu/tutorial.webp',
      gradient: 'linear-gradient(135deg, rgba(184,127,219,0.55), rgba(123,63,160,0.4))',
      emoji: '📖',
      label: t.menu.learnToPlay,
    },
    {
      href: '/opcoes',
      image: '/menu/options.webp',
      gradient: 'linear-gradient(135deg, rgba(255,224,102,0.55), rgba(255,214,0,0.4))',
      emoji: '⚙️',
      label: t.menu.options,
    },
  ];

  return (
    <main
      className="relative min-h-dvh flex flex-col items-center gap-8 p-8 overflow-hidden bg-ink bg-cover bg-center"
      style={{ backgroundImage: `url(${theme.image}), ${theme.fallbackGradient}` }}
    >
      {/* Identity layer over whichever background /opcoes picked: radial
          pink glow + darkening toward ink, so the chrome (title, tiles)
          reads consistently even before real background art exists. */}
      <PageGlow pinkOpacity={0.35} darken={[0.55, 0.85]} />

      <PageHeader size="text-5xl" softDrop={5} logoSize="lg" wrapperClassName="w-full max-w-sm">
        {t.menu.title}
      </PageHeader>

      <div className="relative flex flex-col gap-4 w-full max-w-sm">
        {tiles.map((tile) => (
          <MenuTile key={tile.href} {...tile} />
        ))}
      </div>
    </main>
  );
}

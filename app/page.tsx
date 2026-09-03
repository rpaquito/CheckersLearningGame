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
  'relative flex items-center justify-center h-32 rounded-2xl px-6 overflow-hidden ' +
  'shadow-[4px_4px_0_rgba(0,0,0,0.35)] [clip-path:polygon(0_0,100%_0,100%_88%,96%_100%,0_100%)] ' +
  'transition-transform hover:scale-[1.02]';

const TILE_LABEL_CLASS = 'relative z-10 text-lg font-bold text-center text-white';
const TILE_LABEL_STROKE = titleStroke(1);

interface TileData {
  href: string;
  gradient: string;
  emoji: string;
  label: string;
  onClick?: () => void;
}

function MenuTile({ href, gradient, emoji, label, onClick }: TileData) {
  return (
    <Link href={href} onClick={onClick} className={TILE_CLASS} style={{ background: gradient }}>
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

  // No per-tile illustration yet -- Chess Sensei's vs-cpu.webp/two-players.
  // webp/tutorial.webp/options.webp are chess-specific art; new Draw Things
  // generation for checkers equivalents is Phase 10. Each tile is its own
  // gradient instead, in the same 4 accent colors real art will sit behind
  // once it lands.
  const tiles: TileData[] = [
    {
      href: '/configurar',
      gradient: 'linear-gradient(135deg, #00E5FF, #4EA8DE)',
      emoji: '⚔️',
      label: t.menu.playVsComputer,
    },
    {
      href: '/jogar?mode=local',
      gradient: 'linear-gradient(135deg, #FF9AC2, #FF6FA5)',
      emoji: '✨',
      label: t.menu.twoPlayers,
      onClick: () => clearSavedGame(),
    },
    {
      href: '/aprender',
      gradient: 'linear-gradient(135deg, #B87FDB, #7B3FA0)',
      emoji: '📖',
      label: t.menu.learnToPlay,
    },
    {
      href: '/opcoes',
      gradient: 'linear-gradient(135deg, #FFE066, #FFD600)',
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

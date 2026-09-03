import type { ReactNode } from 'react';

const STROKE_COLOR = '#1A0B33';

/**
 * Solid "comic-book" text-shadow outline (no blur) used on every gold
 * title in the app. `softDropPx`, when given, adds the 45°-drop-shadow
 * page `<h1>`s use (menu tile labels and modal `<h2>`s don't).
 */
export function titleStroke(width: 1 | 2, softDropPx?: number): string {
  const corners = [
    `-${width}px -${width}px 0 ${STROKE_COLOR}`,
    `${width}px -${width}px 0 ${STROKE_COLOR}`,
    `-${width}px ${width}px 0 ${STROKE_COLOR}`,
    `${width}px ${width}px 0 ${STROKE_COLOR}`,
  ];
  if (softDropPx) corners.push(`${softDropPx}px ${softDropPx}px 0 rgba(0,0,0,0.35)`);
  return corners.join(', ');
}

export interface PageTitleProps {
  as?: 'h1' | 'h2';
  /** Tailwind font-size class, e.g. "text-4xl". */
  size?: string;
  strokeWidth?: 1 | 2;
  /** Defaults to 4px when strokeWidth=2, no drop when strokeWidth=1. */
  softDrop?: number;
  className?: string;
  children: ReactNode;
}

/** Gold title with the "comic-book" outline -- see `titleStroke` above. */
export function PageTitle({
  as: Tag = 'h1',
  size = 'text-4xl',
  strokeWidth = 2,
  softDrop = strokeWidth === 2 ? 4 : undefined,
  className = '',
  children,
}: PageTitleProps) {
  return (
    <Tag
      className={`font-display tracking-wide text-gold ${size} ${className}`.trim()}
      style={{ textShadow: titleStroke(strokeWidth, softDrop) }}
    >
      {children}
    </Tag>
  );
}

export interface PageHeaderProps extends PageTitleProps {
  /** 'lg' for the home menu's bigger logo (56px); 'md' (default) elsewhere. */
  logoSize?: 'md' | 'lg';
  /**
   * Extra classes for the logo+title wrapper `<div>`. Needed on pages whose
   * `<main>` uses `items-center`: without an explicit width, this wrapper
   * would stretch to `<main>`'s width under flex's default `align-items:
   * stretch` -- but `items-center` replaces that with "shrink to content
   * and center", which would center the header instead of left-aligning it
   * with the rest of the page. Pass `w-full max-w-*` matching the content
   * column's width below it in that case.
   */
  wrapperClassName?: string;
}

const LOGO_SIZE_CLASS: Record<'md' | 'lg', string> = {
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

/**
 * Logo (`public/icons/icon-192.png` -- a placeholder gold checkers-king
 * icon generated in the PWA phase, see `public/icons/icon-source.svg`;
 * Phase 10 replaces the PNG files at this same path with real Draw Things
 * art, no code change needed) + `PageTitle`, always left-aligned. Use this
 * instead of a bare `<PageTitle>` at the top of any page.
 */
export function PageHeader({ logoSize = 'md', wrapperClassName = '', ...titleProps }: PageHeaderProps) {
  return (
    <div className={`relative flex items-center gap-3 ${wrapperClassName}`.trim()}>
      <div
        aria-hidden="true"
        className={`${LOGO_SIZE_CLASS[logoSize]} shrink-0 rounded-2xl bg-cover bg-center shadow-[3px_3px_0_rgba(0,0,0,0.35)]`}
        style={{ backgroundImage: 'url(/icons/icon-192.png)' }}
      />
      <PageTitle {...titleProps} />
    </div>
  );
}

/**
 * Shared `fixed inset-0` backdrop intended for GameEndModal/RulesModal/
 * ConfirmModal once they are restyled with the new chrome in a future phase.
 * `pt-`/`pb-` (instead of a flat `p-4`) keep the panel clear of a
 * notch/Dynamic Island once the native iOS shell exists (Phase 11) --
 * `max(1rem, …)` keeps today's usual 1rem margin on any device without a
 * notch, or in a normal browser.
 */
export const MODAL_BACKDROP_CLASS =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 ' +
  'pt-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] pb-[max(1rem,env(safe-area-inset-bottom))]';

export interface PageGlowProps {
  /**
   * 'fixed' for scrollable pages (must not enter the flow, so it gets
   * `-z-10`); 'absolute' for single-view screens, where `<main>` already
   * clips overflow and later siblings have their own `relative` to stay on
   * top.
   */
  position?: 'fixed' | 'absolute';
  pinkOpacity?: number;
  /** [top, bottom] -- extra darkening toward ink, only where the
   * background underneath needs more contrast (menu, /jogar). */
  darken?: [number, number];
}

/**
 * Identity layer (radial pink glow, optional darkening toward ink) reused
 * on almost every page.
 */
export function PageGlow({ position = 'absolute', pinkOpacity = 0.2, darken }: PageGlowProps) {
  const layers = [
    `radial-gradient(circle at 50% -10%, rgba(255,111,165,${pinkOpacity}), transparent 55%)`,
  ];
  if (darken) {
    layers.push(
      `linear-gradient(180deg, rgba(26,11,51,${darken[0]}) 0%, rgba(26,11,51,${darken[1]}) 100%)`
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${position} inset-0${position === 'fixed' ? ' -z-10' : ''}`}
      style={{ background: layers.join(', ') }}
    />
  );
}

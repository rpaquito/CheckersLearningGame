import { forwardRef, type ReactNode } from 'react';
import Link from 'next/link';

export type ChipColor = 'purple' | 'cyan' | 'pink' | 'gold';

// Same visual language as the menu tiles (diagonal clip, "stamped" shadow),
// at a secondary scale -- use this for ANY page-level link or action,
// never a bare underlined text link.
const CHIP_GRADIENT: Record<ChipColor, string> = {
  purple: 'linear-gradient(135deg, #B87FDB, #7B3FA0)',
  cyan: 'linear-gradient(135deg, #7DE0E6, #3FA9B0)',
  pink: 'linear-gradient(135deg, #FF9AC2, #FF6FA5)',
  gold: 'linear-gradient(135deg, #FFE066, #FFD600)',
};

const CHIP_TEXT: Record<ChipColor, string> = {
  purple: '#FFF6FF',
  cyan: '#0B2E30',
  pink: '#3A0B1F',
  gold: '#3A2A00',
};

export interface ChipButtonProps {
  color: ChipColor;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const BASE_CLASS =
  'inline-block font-semibold text-sm px-4 py-2 rounded-lg shadow-[3px_3px_0_rgba(0,0,0,0.35)] ' +
  '[clip-path:polygon(0_0,100%_0,100%_82%,93%_100%,0_100%)] transition-transform hover:scale-[1.03]';

// `ref` is only forwarded to the native button (the no-`href` variant) --
// the only case with a real consumer so far would be a future step-viewer
// needing manual focus management near a disabled boundary. The `<Link>`
// variant ignores the ref; add support there only when a real consumer
// needs it.
export const ChipButton = forwardRef<HTMLButtonElement, ChipButtonProps>(function ChipButton(
  { color, children, href, onClick, disabled = false, className = '' },
  ref
) {
  const style = { background: CHIP_GRADIENT[color], color: CHIP_TEXT[color] };
  const disabledClasses = disabled ? ' opacity-40 pointer-events-none' : '';
  const classes = `${BASE_CLASS}${disabledClasses} ${className}`.trim();

  if (href) {
    // <a> has no native `disabled` -- `pointer-events-none` (in
    // `disabledClasses`) already blocks the click, but without this the
    // link stays reachable and activatable via Tab+Enter.
    return (
      <Link
        href={href}
        style={style}
        className={classes}
        onClick={onClick}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref} type="button" onClick={onClick} disabled={disabled} style={style} className={classes}>
      {children}
    </button>
  );
});

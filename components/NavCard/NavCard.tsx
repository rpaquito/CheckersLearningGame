import Link from 'next/link';

/**
 * Link card "title + description [+ meta]" -- the hub's tile shell.
 * `meta` was deliberately omitted when this component was first built
 * (Phase 6, Tutorial Hub) since nothing needed it yet; the openings list
 * (Phase 7) is the first real consumer, showing each opening's line name.
 */
export function NavCard({
  href,
  title,
  description,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border-2 border-purple/40 bg-ink-soft p-4 transition-colors hover:border-cyan"
    >
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-lilac/80">{description}</p>
      {meta && <p className="text-xs text-lilac/60 mt-1">{meta}</p>}
    </Link>
  );
}

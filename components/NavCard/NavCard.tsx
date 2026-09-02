import Link from 'next/link';

/**
 * Link card "title + description" -- the hub's tile shell. `meta` (an
 * optional third line) is deliberately NOT included here even though
 * Chess Sensei's version has one for its openings list -- nothing in this
 * repo needs it yet (the openings/traps trainer is a later phase); add it
 * back if/when that phase's NavCard usage needs it.
 */
export function NavCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border-2 border-purple/40 bg-ink-soft p-4 transition-colors hover:border-cyan"
    >
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-lilac/80">{description}</p>
    </Link>
  );
}

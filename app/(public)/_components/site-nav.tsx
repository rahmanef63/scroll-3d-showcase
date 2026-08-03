import Link from 'next/link';

/**
 * The two ways out of the scene: the guide, and the editor that produced it.
 *
 * Rendered by the page rather than inside the slice — the showcase is
 * brand-agnostic and knows nothing about this site's routes. It sits above the
 * HUD (`z-6`) and the copy panels (`z-5`), and it is the one interactive thing
 * on an otherwise inert overlay, so it opts pointer events back in.
 *
 * Bottom right, clear of the corner bracket: the rail and the meter own the
 * vertical centres, the scroll hint owns the bottom centre, and below `md` the
 * copy panels stack into everything above the hint.
 */
export function SiteNav() {
  return (
    <nav
      aria-label="Site"
      className="fixed bottom-(--showcase-pad) right-[calc(var(--showcase-pad)+56px)] z-10 flex gap-2 font-mono text-[9px] uppercase tracking-[0.18em]"
    >
      <NavLink href="/docs">Docs</NavLink>
      <NavLink href="/studio">Studio</NavLink>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="flex h-6 items-center border border-showcase-line bg-showcase-bg/70 px-2 text-showcase-muted backdrop-blur-sm transition-colors hover:border-showcase-primary hover:text-showcase-primary focus-visible:border-showcase-primary focus-visible:text-showcase-primary focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}

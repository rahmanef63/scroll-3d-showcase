import Link from 'next/link';
import type { Metadata } from 'next';
import { REPO_URL, STEPS } from './_steps';

export const metadata: Metadata = {
  title: 'Guide — build one with your own model',
  description:
    'Clone the repo, drop a .glb into public/, tune the camera in /studio and publish. Step by step.',
};

/**
 * Static from end to end — no data, no cache entry, nothing to invalidate. The
 * one page on this site that is a document rather than a scene, so it drops the
 * fixed overlays entirely and just scrolls.
 */
export default function DocsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-12 px-6 py-16 md:px-10">
      <header className="flex flex-col gap-5">
        <nav aria-label="Site" className="flex gap-2 font-mono text-[9px] uppercase tracking-[0.18em]">
          <Chip href="/">← Showcase</Chip>
          <Chip href="/studio">Studio</Chip>
          <Chip href={REPO_URL}>Source</Chip>
        </nav>

        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-showcase-primary">
          Guide
        </p>
        <h1 className="font-display text-[clamp(30px,6vw,52px)] font-bold uppercase leading-[0.95]">
          Build one with
          <br />
          your own model
        </h1>
        <p className="max-w-2xl text-showcase-muted">
          This page is a scroll-driven 3D showcase: one model, a camera path with a stop on every
          detail worth naming, and copy that fades in beside it. The model is swappable and the
          camera path is edited in the browser, so the same site works for a product, a character
          or a self portrait. Nine steps, from clone to deploy.
        </p>
      </header>

      <ol className="flex flex-col gap-10">
        {STEPS.map((step) => (
          <li key={step.n} className="flex flex-col gap-3 border-t border-showcase-line pt-5">
            <p className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] tracking-[0.24em] text-showcase-primary">
                {step.n}
              </span>
              <span className="font-display text-lg font-bold uppercase tracking-[0.04em]">
                {step.title}
              </span>
            </p>
            <p className="text-showcase-muted">{step.body}</p>
            {step.code ? (
              // Long commands must scroll inside the block, never widen the page.
              <pre className="overflow-x-auto border border-showcase-line bg-card/60 p-3 font-mono text-[11px] leading-relaxed text-showcase-fg">
                <code>{step.code}</code>
              </pre>
            ) : null}
          </li>
        ))}
      </ol>

      <footer className="flex flex-col gap-3 border-t border-showcase-line pt-5 text-showcase-muted">
        <p>
          The whole editor is one route and the whole scene is one slice — read{' '}
          <Anchor href={`${REPO_URL}#readme`}>the README</Anchor> for the architecture, or{' '}
          <Anchor href={`${REPO_URL}/issues`}>open an issue</Anchor> when a step here turns out to
          be a lie.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]">
          <Anchor href={REPO_URL}>github.com/rahmanef63/scroll-3d-showcase</Anchor>
        </p>
      </footer>
    </main>
  );
}

function Chip({ href, children }: { href: string; children: string }) {
  const external = href.startsWith('http');
  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className="flex h-6 items-center border border-showcase-line px-2 text-showcase-muted transition-colors hover:border-showcase-primary hover:text-showcase-primary"
    >
      {children}
    </Link>
  );
}

function Anchor({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-showcase-primary underline underline-offset-4 hover:text-showcase-fg"
    >
      {children}
    </a>
  );
}

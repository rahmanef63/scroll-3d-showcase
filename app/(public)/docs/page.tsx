import Link from 'next/link';
import type { Metadata } from 'next';
import { MODEL_STEPS } from './_model-steps';
import { REPO_URL, STEPS, type DocStep } from './_steps';

export const metadata: Metadata = {
  title: 'Guide — build one with your own model',
  description:
    'Generate a 3D model from reference images, assemble it in Blender, then tune the camera in /studio and publish. Step by step.',
};

/**
 * Static from end to end — no data, no cache entry, nothing to invalidate. The
 * one page on this site that is a document rather than a scene, so it drops the
 * fixed overlays entirely and just scrolls.
 *
 * Two parts because they fail differently: the model is a pipeline of other
 * people's tools and hand work, and the site is this repo.
 */
export default function DocsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-14 px-6 py-16 md:px-10">
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
          camera path is edited in the browser, so the same site carries a product, a character or a
          self portrait. Part one makes the model. Part two makes the site.
        </p>
      </header>

      <Part
        kicker="Part one"
        title="Make the model"
        lead="Nine steps from one photo to a .glb small enough to ship — with the two prompts I actually used and the real reference set behind the model on this page, mistakes included. Every tool here is somebody else's; swap any of them for one you prefer."
        steps={MODEL_STEPS}
      />

      <Part
        kicker="Part two"
        title="Build the site"
        lead="Eleven steps from clone to deployed, the last of which is just me asking to see the result."
        steps={STEPS}
      />

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

function Part({
  kicker,
  title,
  lead,
  steps,
}: {
  kicker: string;
  title: string;
  lead: string;
  steps: readonly DocStep[];
}) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-showcase-primary">
          {kicker}
        </p>
        <h2 className="font-display text-[clamp(22px,4vw,32px)] font-bold uppercase leading-none">
          {title}
        </h2>
        <p className="max-w-2xl text-showcase-muted">{lead}</p>
      </div>

      <ol className="flex flex-col gap-10">
        {steps.map((step) => (
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

            {step.images ? (
              <div className="mt-1 grid gap-4 sm:grid-cols-2">
                {step.images.map((image) => (
                  <figure key={image.src} className="flex flex-col gap-2">
                    {/* Plain <img> on purpose: reference art below the fold, already
                        lazy and already webp. next/image would put the optimizer —
                        and its sharp dependency — in the standalone Docker runtime
                        for two static files that never change size. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.src}
                      alt={image.alt}
                      width={1200}
                      height={800}
                      loading="lazy"
                      className="w-full border border-showcase-line"
                    />
                    <figcaption className="font-mono text-[10px] uppercase tracking-[0.16em] text-showcase-muted">
                      {image.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : null}

            {step.code ? (
              // Long commands must scroll inside the block, never widen the page.
              <pre className="overflow-x-auto border border-showcase-line bg-card/60 p-3 font-mono text-[11px] leading-relaxed text-showcase-fg">
                <code>{step.code}</code>
              </pre>
            ) : null}

            {step.links ? (
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {step.links.map((link) => (
                  <li key={link.href} className="font-mono text-[11px]">
                    <Anchor href={link.href}>{link.label}</Anchor>
                    {link.note ? (
                      <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-showcase-muted">
                        {link.note}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
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

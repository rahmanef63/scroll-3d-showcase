'use client';

import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { REPO_URL } from '@/app/(public)/docs/_steps';
import { Button } from '@/components/ui/button';
import { unlock } from '../actions';

/**
 * Form post to the unlock action: the token travels in the POST body and nowhere
 * else — never a query, never client state. The only reason this is a client
 * component at all is the pending label on the button.
 *
 * The note under it is the honest answer to what a visitor who finds this page
 * actually wants: the password is one person's, but the whole thing is theirs
 * to clone.
 */
export function UnlockForm({ failed, disabled }: { failed: boolean; disabled: boolean }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <form action={unlock} className="flex flex-col gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-showcase-primary">
          Studio
        </p>
        <h1 className="text-[clamp(24px,5vw,40px)] font-bold uppercase leading-none">Locked</h1>
        <input
          type="password"
          name="password"
          aria-label="Studio password"
          autoComplete="current-password"
          required
          className="h-9 rounded-md border border-border bg-card px-3 font-mono text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <SubmitButton />
        {/* Two different failures, and conflating them sends the reader hunting
            for a typo in a password that was never going to work. */}
        {disabled ? (
          <p className="font-mono text-xs text-showcase-warn" role="alert">
            The studio is switched off on this deploy — STUDIO_TOKEN is not set.
          </p>
        ) : failed ? (
          <p className="font-mono text-xs text-showcase-accent" role="alert">
            Wrong password.
          </p>
        ) : null}
      </form>

      <div className="flex flex-col gap-3 border-t border-showcase-line pt-5 text-left text-sm text-showcase-muted">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-showcase-fg">
          Want one with your own model?
        </p>
        <p>
          The editor behind this password is open source. Clone{' '}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-showcase-primary underline underline-offset-4 hover:text-showcase-fg"
          >
            the repo
          </a>
          , drop your .glb into public/, and run the studio on your own machine with your own
          password. The{' '}
          <Link
            href="/docs"
            className="text-showcase-primary underline underline-offset-4 hover:text-showcase-fg"
          >
            step-by-step guide
          </Link>{' '}
          takes it from clone to deployed.
        </p>
      </div>
    </div>
  );
}

/**
 * The form posts to a server action, which on a slow link leaves the button
 * looking untouched — so it says what it is doing and refuses a second click.
 * `useFormStatus` has to read the form from a child of it, which is the only
 * reason this is its own component.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="font-mono text-xs uppercase tracking-[0.2em]"
    >
      {pending ? 'Checking…' : 'Unlock'}
    </Button>
  );
}

import { Button } from '@/components/ui/button';
import { unlock } from '../actions';

/**
 * Plain form post to the unlock action — no client JS, no state, and the token
 * only ever travels in the POST body.
 */
export function UnlockForm({ failed }: { failed: boolean }) {
  return (
    <form action={unlock} className="flex w-full max-w-sm flex-col gap-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-showcase-primary">
        Studio
      </p>
      <h1 className="text-[clamp(24px,5vw,40px)] font-bold uppercase leading-none">
        Terkunci
      </h1>
      <input
        type="password"
        name="password"
        aria-label="Studio password"
        autoComplete="current-password"
        required
        className="h-9 rounded-md border border-border bg-card px-3 font-mono text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <Button type="submit" className="font-mono text-xs uppercase tracking-[0.2em]">
        Buka
      </Button>
      {failed ? (
        <p className="font-mono text-xs text-showcase-accent" role="alert">
          Password salah.
        </p>
      ) : null}
    </form>
  );
}

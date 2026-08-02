'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * The studio's own boundary, separate from `(public)/error.tsx` because the two
 * fail for different reasons and want different advice. Here the likely causes
 * are a backend that is down or a saved row the editor cannot read — neither of
 * which a visitor can do anything about, but the owner can.
 *
 * The message shows `digest` rather than `error.message`: a server-side throw is
 * redacted in production anyway, and the digest is what matches a server log.
 */
export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[studio:error-boundary]', error.digest, error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-showcase-accent">
        Studio gagal dibuka
      </p>
      <h1 className="max-w-[24ch] text-[clamp(24px,5vw,40px)] font-bold uppercase leading-none">
        Editor tidak bisa dimuat
      </h1>
      <p className="max-w-[46ch] text-sm text-showcase-muted">
        Halaman publik tidak terpengaruh — dia dilayani dari cache dan tidak
        membaca apa pun yang gagal di sini. Cek Convex dan{' '}
        <code className="font-mono text-showcase-fg">STUDIO_TOKEN</code>, lalu coba lagi.
      </p>
      {error.digest ? (
        <p className="font-mono text-[10px] tracking-[0.2em] text-showcase-muted">
          DIGEST {error.digest}
        </p>
      ) : null}
      <Button onClick={reset} className="font-mono text-xs uppercase tracking-[0.2em]">
        Coba lagi
      </Button>
    </main>
  );
}

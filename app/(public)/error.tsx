'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[public:error-boundary]', error.digest, error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-showcase-accent">
        Ada yang error
      </p>
      <h1 className="max-w-[20ch] text-[clamp(28px,6vw,52px)] font-bold uppercase leading-none">
        Halaman ini gagal dimuat
      </h1>
      <p className="max-w-[42ch] text-sm text-showcase-muted">
        Coba muat ulang. Kalau masih sama, kemungkinan ada masalah di sisi server.
      </p>
      <Button onClick={reset} className="font-mono text-xs uppercase tracking-[0.2em]">
        Coba lagi
      </Button>
    </main>
  );
}

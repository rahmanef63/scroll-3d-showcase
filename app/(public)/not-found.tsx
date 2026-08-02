import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PublicNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-showcase-primary">
        404
      </p>
      <h1 className="max-w-[20ch] text-[clamp(28px,6vw,52px)] font-bold uppercase leading-none">
        Halaman tidak ketemu
      </h1>
      <Button asChild className="font-mono text-xs uppercase tracking-[0.2em]">
        <Link href="/">Kembali ke depan</Link>
      </Button>
    </main>
  );
}

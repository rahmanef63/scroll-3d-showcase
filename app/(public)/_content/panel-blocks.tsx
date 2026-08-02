'use client';

import { Button } from '@/components/ui/button';
import { useShowcaseJump } from '@/slices/scroll-3d-showcase';

const OUTLINE_BUTTON =
  'h-auto rounded-none border border-showcase-line bg-showcase-bg/50 px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.2em] backdrop-blur-sm hover:border-showcase-primary hover:bg-showcase-primary hover:text-showcase-bg';

export function JumpButton({ to, children }: { to: string; children: string }) {
  const { jumpToSection } = useShowcaseJump();
  return (
    <Button variant="ghost" className={OUTLINE_BUTTON} onClick={() => jumpToSection(to)}>
      {children}
    </Button>
  );
}

export function LinkButton({
  href,
  children,
  solid,
}: {
  href: string;
  children: string;
  solid?: boolean;
}) {
  return (
    <Button
      asChild
      variant="ghost"
      className={
        solid
          ? `${OUTLINE_BUTTON} border-showcase-primary bg-showcase-primary text-showcase-bg hover:bg-showcase-fg`
          : OUTLINE_BUTTON
      }
    >
      <a href={href}>{children}</a>
    </Button>
  );
}

export function ActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2.5 md:mt-7 md:justify-[inherit]">
      {children}
    </div>
  );
}

export function StatGrid({ items }: { items: { value: string; label: string }[] }) {
  return (
    <dl className="mt-[18px] flex flex-wrap justify-center gap-3 md:mt-6 md:justify-[inherit] md:gap-[clamp(14px,2.2vw,28px)]">
      {items.map((item) => (
        <div key={item.label} className="min-w-[62px] border-l border-showcase-line pl-3 text-left md:min-w-[74px]">
          <dd className="font-mono text-[clamp(18px,2.2vw,25px)] leading-[1.15] text-showcase-fg">
            {item.value}
          </dd>
          <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-showcase-muted">
            {item.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}

export function SkillBars({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="mx-auto mt-[18px] flex max-w-[330px] flex-col gap-2.5 md:mt-6">
      {items.map((item) => (
        <div key={item.label} className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-showcase-muted">
          <div className="mb-1.5 flex justify-between">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
          <div
            role="meter"
            aria-valuenow={item.value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={item.label}
            className="relative h-[3px] overflow-hidden bg-showcase-muted/20"
          >
            <span
              style={{ width: `${item.value}%` }}
              className="absolute inset-y-0 left-0 bg-linear-to-r from-showcase-primary to-showcase-accent shadow-[0_0_10px_var(--showcase-primary)]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardGrid({ items }: { items: { title: string; meta: string }[] }) {
  return (
    <ul className="mx-auto mt-[18px] grid max-w-[430px] grid-cols-2 gap-2.5 md:mt-6">
      {items.map((item) => (
        <li
          key={item.title}
          className="relative overflow-hidden border border-showcase-line/50 bg-showcase-bg/50 p-3.5 text-left backdrop-blur-sm before:absolute before:left-0 before:top-0 before:h-px before:w-3.5 before:bg-showcase-primary"
        >
          <p className="mb-1 text-sm font-semibold">{item.title}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-showcase-muted">
            {item.meta}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SocialList({ items }: { items: { label: string; value: string; href: string }[] }) {
  return (
    <ul className="mx-auto mt-[18px] flex max-w-[400px] flex-col md:mt-6">
      {items.map((item) => (
        <li key={item.label} className="border-b border-showcase-line/50 first:border-t">
          <a
            href={item.href}
            target={item.href.startsWith('http') ? '_blank' : undefined}
            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="pointer-events-auto flex items-center justify-between gap-4 px-1 py-3 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors hover:text-showcase-primary"
          >
            {item.label}
            <span className="text-showcase-muted">{item.value}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

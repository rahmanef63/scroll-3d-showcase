'use client';

import type { ReactNode } from 'react';
import {
  ActionRow,
  CardGrid,
  JumpButton,
  LinkButton,
  SkillBars,
  SocialList,
  StatGrid,
} from './panel-blocks';

/**
 * The rich half of each panel, keyed by section id.
 *
 * Not editable from /studio, on purpose: a stat grid is a component with its own
 * props, not something you type into a form. The text around it IS editable —
 * see `copy.ts` — and the two are joined by id in `sections.tsx`. Rename a
 * section's id in the studio and its blocks stop appearing, which is the honest
 * outcome: they were authored for that stop.
 *
 * One object per character, on separate id ranges, so loading one preset in the
 * studio can never hand it the other one's numbers.
 */
const KEANU_EXTRAS: Record<string, ReactNode> = {
  '01': (
    <ActionRow>
      <JumpButton to="02">Keep scrolling, genius</JumpButton>
      <LinkButton href="https://rahmanef.com">Skip to the competent part</LinkButton>
    </ActionRow>
  ),
  '02': (
    <>
      <StatGrid
        items={[
          { value: '312k', label: 'Triangles' },
          { value: '0', label: 'Rig bones' },
          { value: '2.5 MB', label: 'Down from 18' },
          { value: '1', label: 'Attempt' },
        ]}
      />
      <SkillBars
        items={[
          { label: 'Jacket stitching', value: 89 },
          { label: 'Facial likeness', value: 58 },
          { label: 'Hand anatomy', value: 41 },
        ]}
      />
    </>
  ),
  '03': (
    <>
      <CardGrid
        items={[
          { title: 'PERFUME BOTTLE', meta: 'Frame the neck' },
          { title: 'SNEAKER', meta: 'Frame the stitching' },
          { title: 'WATCH', meta: 'Frame the dial' },
          { title: 'CAMERA', meta: 'Frame the lens ring' },
        ]}
      />
      <ActionRow>
        <JumpButton to="04">See the one good part</JumpButton>
      </ActionRow>
    </>
  ),
  '04': (
    <>
      <SocialList
        items={[
          { label: 'Site', value: 'rahmanef.com', href: 'https://rahmanef.com' },
          { label: 'Instagram', value: '@rahmanef_', href: 'https://instagram.com/rahmanef_' },
          { label: 'TikTok', value: '@rahmanfakhrul', href: 'https://tiktok.com/@rahmanfakhrul' },
          { label: 'YouTube', value: 'RahmanFakhrul', href: 'https://youtube.com/@RahmanFakhrul' },
          { label: 'X', value: '@rahmnF', href: 'https://x.com/rahmnF' },
          { label: 'LinkedIn', value: 'rahmanfakhrul', href: 'https://linkedin.com/in/rahmanfakhrul' },
          { label: 'Threads', value: '@rahmanef_', href: 'https://threads.net/@rahmanef_' },
          { label: 'Facebook', value: 'rahmanef63', href: 'https://facebook.com/rahmanef63' },
        ]}
      />
      <ActionRow>
        <LinkButton href="https://rahmanef.com" solid>
          Bring me something real
        </LinkButton>
      </ActionRow>
    </>
  ),
};

const RAHMAN_EXTRAS: Record<string, ReactNode> = {
  r1: (
    <ActionRow>
      <JumpButton to="r2">Fine, keep going</JumpButton>
      <LinkButton href="https://rahmanef.com">The part with actual work on it</LinkButton>
    </ActionRow>
  ),
  r2: (
    <>
      <StatGrid
        items={[
          { value: '130k', label: 'Triangles' },
          { value: '3', label: '4K atlases' },
          { value: '3.4 MB', label: 'Down from 10.8' },
          { value: '3', label: 'Attempts' },
        ]}
      />
      <SkillBars
        items={[
          { label: 'Glasses', value: 94 },
          { label: 'Jawline, generously', value: 71 },
          { label: 'Hair I actually have', value: 12 },
        ]}
      />
    </>
  ),
  r3: (
    <>
      <CardGrid
        items={[
          { title: 'PERFUME BOTTLE', meta: 'Frame the neck' },
          { title: 'SNEAKER', meta: 'Frame the stitching' },
          { title: 'WATCH', meta: 'Frame the dial' },
          { title: 'CAMERA', meta: 'Frame the lens ring' },
        ]}
      />
      <ActionRow>
        <JumpButton to="r4">Skip to the contacts</JumpButton>
      </ActionRow>
    </>
  ),
  r4: (
    <>
      <SocialList
        items={[
          { label: 'Site', value: 'rahmanef.com', href: 'https://rahmanef.com' },
          { label: 'Instagram', value: '@rahmanef_', href: 'https://instagram.com/rahmanef_' },
          { label: 'TikTok', value: '@rahmanfakhrul', href: 'https://tiktok.com/@rahmanfakhrul' },
          { label: 'YouTube', value: 'RahmanFakhrul', href: 'https://youtube.com/@RahmanFakhrul' },
          { label: 'X', value: '@rahmnF', href: 'https://x.com/rahmnF' },
          { label: 'LinkedIn', value: 'rahmanfakhrul', href: 'https://linkedin.com/in/rahmanfakhrul' },
          { label: 'Threads', value: '@rahmanef_', href: 'https://threads.net/@rahmanef_' },
          { label: 'Facebook', value: 'rahmanef63', href: 'https://facebook.com/rahmanef63' },
        ]}
      />
      <ActionRow>
        <LinkButton href="https://rahmanef.com" solid>
          Bring me something real
        </LinkButton>
      </ActionRow>
    </>
  ),
};

export const EXTRAS: Record<string, ReactNode> = { ...KEANU_EXTRAS, ...RAHMAN_EXTRAS };

/**
 * Which ids have blocks, for the studio to warn about drift.
 *
 * Derived rather than written down, so it can never disagree with `EXTRAS`.
 */
export const BLOCK_IDS = Object.keys(EXTRAS);

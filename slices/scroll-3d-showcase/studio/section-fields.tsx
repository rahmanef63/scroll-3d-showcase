'use client';

import type { ShowcaseCopy } from '../types';
import { FieldSlider } from './field-slider';
import { COPY_RANGES } from './presets';
import { Chip, LABEL, StackField, TAP } from './studio-ui';

const TIMING: readonly (readonly [keyof typeof COPY_RANGES, string])[] = [
  ['progress', 'PROGRESS'],
  ['fadeIn', 'FADE IN'],
  ['fadeOut', 'FADE OUT'],
];

export interface SectionFieldsProps {
  section: ShowcaseCopy;
  index: number;
  /** No rich blocks are registered under this id. */
  orphaned: boolean;
  onPatch: (index: number, values: Partial<ShowcaseCopy>) => void;
  onRemove: (index: number) => void;
}

/** One copy panel's form. Split out of the tab so each stays under the cap. */
export function SectionFields({
  section,
  index,
  orphaned,
  onPatch,
  onRemove,
}: SectionFieldsProps) {
  const patch = (values: Partial<ShowcaseCopy>) => onPatch(index, values);

  return (
    <section className="border border-showcase-line/70 p-2">
      <header className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className={`${LABEL} text-showcase-primary`}>
          {section.id} · {section.name}
        </h3>
        <span className="flex gap-1">
          {/* Two states, so a toggle rather than a select: it says which side the
              copy is on now and flips it in one tap. */}
          <Chip
            onClick={() => patch({ align: section.align === 'start' ? 'end' : 'start' })}
            title="Which side the copy sits on"
            className={TAP}
          >
            {section.align === 'start' ? '◧ LEFT' : 'RIGHT ◨'}
          </Chip>
          <Chip
            onClick={() => onRemove(index)}
            title="Delete this panel"
            className={`${TAP} hover:text-showcase-accent`}
          >
            ×
          </Chip>
        </span>
      </header>

      <div className="flex flex-col gap-1.5">
        <StackField
          label="ID"
          value={section.id}
          hint="jump anchor"
          onChange={(id) => patch({ id })}
        />
        {/* The join to the host's blocks is by id and nothing enforces it, so
            editing this field can drop a stat grid with no other symptom until
            you open the public page. This is that symptom, moved here. */}
        {orphaned ? (
          <p className={`${LABEL} normal-case tracking-normal text-showcase-warn`}>
            No blocks registered for this id — text only.
          </p>
        ) : null}
        <StackField label="NAME" value={section.name} onChange={(name) => patch({ name })} />

        {TIMING.map(([key, label]) => (
          <FieldSlider
            key={key}
            label={label}
            {...COPY_RANGES[key]}
            value={section[key]}
            // A computed key widens to `string`; TIMING is what keeps it honest.
            onInput={(value) => patch({ [key]: value } as Partial<ShowcaseCopy>)}
          />
        ))}

        <StackField
          label="KICKER"
          value={section.kicker}
          onChange={(kicker) => patch({ kicker })}
        />
        <StackField
          label="HEADING"
          value={section.heading}
          hint="⏎ breaks · | outlines"
          rows={2}
          onChange={(heading) => patch({ heading })}
        />
        <StackField
          label="BODY"
          value={section.body}
          rows={6}
          onChange={(body) => patch({ body })}
        />
      </div>
    </section>
  );
}

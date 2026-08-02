'use client';

import type { ShowcaseContent, ShowcaseCopy } from '../types';
import type { ContentPreset } from './types';
import { SectionFields } from './section-fields';
import { Chip, Group, LABEL, StackField, TAP } from './studio-ui';

export interface ContentFieldsProps {
  content: ShowcaseContent;
  /** Scroll position a new panel lands on. */
  getProgress: () => number;
  /** Ids the host has rich blocks for. Undefined means "do not check". */
  blockIds?: readonly string[];
  /** Whole-copy presets the host offers. Empty or absent renders no chips. */
  presets?: readonly ContentPreset[];
  onLoadPreset: (content: ShowcaseContent) => void;
  onPatch: (values: Partial<Omit<ShowcaseContent, 'sections'>>) => void;
  onPatchSection: (index: number, values: Partial<ShowcaseCopy>) => void;
  onAdd: (p: number) => void;
  onRemove: (index: number) => void;
}

/**
 * COPY tab: the words. Everything a visitor reads that is not baked into the
 * host's rich blocks — title, brand, meta description, and per-section kicker /
 * heading / body — lives here and saves with the rest of the preset.
 *
 * The panels themselves are not previewed in the studio: they would sit under
 * the chrome, and the public page is one click away.
 */
export function ContentFields({
  content,
  getProgress,
  blockIds,
  presets,
  onLoadPreset,
  onPatch,
  onPatchSection,
  onAdd,
  onRemove,
}: ContentFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      {presets && presets.length > 0 ? (
        <Group title="CHARACTER">
          {/* Matched on the section ids, not on the title: those survive every
              word being rewritten, which is the entire job of this tab. */}
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <Chip
                key={preset.id}
                active={sameSections(preset.content, content)}
                onClick={() => onLoadPreset(preset.content)}
                title={`Load every word of "${preset.label}". Undo brings it back.`}
                className={TAP}
              >
                {preset.label}
              </Chip>
            ))}
          </div>
          <p className={`mt-1.5 ${LABEL} normal-case tracking-normal`}>
            Words only — pick the model in the bar above.
          </p>
        </Group>
      ) : null}

      <Group title="SITE">
        <div className="flex flex-col gap-1.5">
          <StackField
            label="TITLE"
            value={content.title}
            hint="hud + tab + share"
            onChange={(title) => onPatch({ title })}
          />
          <StackField
            label="BOOT"
            value={content.bootTitle ?? ''}
            hint="loading screen · blank = title"
            onChange={(bootTitle) => onPatch({ bootTitle })}
          />
          <StackField
            label="BRAND"
            value={content.brand}
            hint="after the title in the hud"
            onChange={(brand) => onPatch({ brand })}
          />
          <StackField
            label="DESCRIPTION"
            value={content.description}
            hint="search results only"
            rows={3}
            onChange={(description) => onPatch({ description })}
          />
        </div>
      </Group>

      <Group
        title={`PANELS ${content.sections.length}`}
        right={
          <Chip onClick={() => onAdd(getProgress())} title="Add a panel at the current scroll">
            +
          </Chip>
        }
      >
        {content.sections.length === 0 ? (
          <p className={`${LABEL} normal-case tracking-normal`}>
            No copy panels. The scene still runs; there is just nothing to read.
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          {content.sections.map((section, index) => (
            <SectionFields
              key={index}
              section={section}
              index={index}
              // Undefined blockIds = the host never said, so claim nothing.
              orphaned={blockIds ? !blockIds.includes(section.id) : false}
              onPatch={onPatchSection}
              onRemove={onRemove}
            />
          ))}
        </div>
      </Group>
    </div>
  );
}

/** Same panels, whatever anyone has typed into them since. */
const sameSections = (a: ShowcaseContent, b: ShowcaseContent) =>
  a.sections.length === b.sections.length &&
  a.sections.every((section, index) => section.id === b.sections[index].id);

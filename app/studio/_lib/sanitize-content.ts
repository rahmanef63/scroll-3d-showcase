import { MAX_BODY, MAX_LINE, MAX_TEXT, bounded, number, record, text } from './wire-guards';

const MAX_SECTIONS = 24;

export interface WireCopy {
  id: string;
  name: string;
  progress: number;
  fadeIn: number;
  fadeOut: number;
  align: 'start' | 'end';
  kicker: string;
  heading: string;
  body: string;
}

export interface WireContent {
  title: string;
  bootTitle?: string;
  brand: string;
  description: string;
  sections: WireCopy[];
}

/**
 * Zero sections is legal — a showcase with no copy is just the scene — so the
 * only thing an absent block means is "this deploy has no copy to save".
 */
export function toContent(raw: unknown): WireContent | undefined {
  if (raw === undefined || raw === null) return undefined;
  const source = record(raw, 'content');
  const bootTitle = source.bootTitle === undefined || source.bootTitle === null
    ? undefined
    : text(source.bootTitle, 'bootTitle', MAX_LINE);
  return {
    title: text(source.title, 'title', MAX_LINE),
    ...(bootTitle === undefined ? {} : { bootTitle }),
    brand: text(source.brand, 'brand', MAX_TEXT),
    description: text(source.description, 'description', MAX_LINE),
    sections: bounded(source.sections, MAX_SECTIONS, 'sections').map(toCopy),
  };
}

function toCopy(raw: unknown, index: number): WireCopy {
  const copy = record(raw, `sections[${index}]`);
  // The id is a DOM id and a React key, so anything that is not a plain slug
  // would either collide or break the in-page jump it exists for.
  const id = text(copy.id, `sections[${index}].id`, MAX_TEXT);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) {
    throw new Error(`Preset: sections[${index}].id must be alphanumeric`);
  }
  if (copy.align !== 'start' && copy.align !== 'end') {
    throw new Error(`Preset: sections[${index}].align must be "start" or "end"`);
  }
  return {
    id,
    name: text(copy.name, 'section name', MAX_TEXT),
    progress: number(copy.progress, 'section progress'),
    fadeIn: number(copy.fadeIn, 'section fadeIn'),
    fadeOut: number(copy.fadeOut, 'section fadeOut'),
    align: copy.align,
    kicker: text(copy.kicker, 'kicker', MAX_LINE),
    heading: text(copy.heading, 'heading', MAX_LINE),
    body: text(copy.body, 'body', MAX_BODY),
  };
}

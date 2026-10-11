import { SOLAR } from '../components/icons/solarData.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Obsidian's 13 callout types, each with the aliases it accepts. Colour is chosen in CSS
// from data-callout-kind, with Arc semantic tokens only.
const KINDS = {
  note: { aliases: [], icon: SOLAR['pen-linear'] },
  abstract: { aliases: ['summary', 'tldr'], icon: SOLAR['clipboard-list-linear'] },
  info: { aliases: [], icon: SOLAR['info-circle-linear'] },
  todo: { aliases: [], icon: SOLAR['check-circle-linear'] },
  tip: { aliases: ['hint', 'important'], icon: SOLAR['fire-linear'] },
  success: { aliases: ['check', 'done'], icon: SOLAR['check-linear'] },
  question: { aliases: ['help', 'faq'], icon: SOLAR['question-circle-linear'] },
  warning: { aliases: ['caution', 'attention'], icon: SOLAR['danger-triangle-linear'] },
  failure: { aliases: ['fail', 'missing'], icon: SOLAR['close-linear'] },
  danger: { aliases: ['error'], icon: SOLAR['bolt-linear'] },
  bug: { aliases: [], icon: SOLAR['bug-linear'] },
  example: { aliases: [], icon: SOLAR['list-linear'] },
  quote: { aliases: ['cite'], icon: SOLAR['quote-linear'] },
};

const KIND_BY_NAME = new Map(
  Object.entries(KINDS).flatMap(([kind, { aliases }]) => [kind, ...aliases].map((name) => [name, kind])),
);

export const CALLOUT_KINDS = Object.keys(KINDS);

/** The canonical type for a typed one. Unknown types are styled as a note but keep their own text. */
export const calloutKind = (type) => KIND_BY_NAME.get(String(type).toLowerCase()) ?? 'note';

/** What Obsidian shows when the title is left out: the type, capitalized. */
export const defaultCalloutTitle = (type) => {
  const text = String(type);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const buildSvg = (body, size) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  };
  Object.entries(attrs).forEach(([name, value]) => svg.setAttribute(name, String(value)));
  svg.innerHTML = body; // static markup from our own icon table
  return svg;
};

const ICON_SIZE = 18;

export const createCalloutIcon = (type) => buildSvg(KINDS[calloutKind(type)].icon, ICON_SIZE);
export const createFoldIcon = () => buildSvg(SOLAR['alt-arrow-down-linear'], ICON_SIZE);

import { __iconNode as pencil } from 'lucide-react/dist/esm/icons/pencil.js';
import { __iconNode as clipboardList } from 'lucide-react/dist/esm/icons/clipboard-list.js';
import { __iconNode as info } from 'lucide-react/dist/esm/icons/info.js';
import { __iconNode as circleCheck } from 'lucide-react/dist/esm/icons/circle-check.js';
import { __iconNode as flame } from 'lucide-react/dist/esm/icons/flame.js';
import { __iconNode as check } from 'lucide-react/dist/esm/icons/check.js';
import { __iconNode as circleHelp } from 'lucide-react/dist/esm/icons/circle-question-mark.js';
import { __iconNode as triangleAlert } from 'lucide-react/dist/esm/icons/triangle-alert.js';
import { __iconNode as x } from 'lucide-react/dist/esm/icons/x.js';
import { __iconNode as zap } from 'lucide-react/dist/esm/icons/zap.js';
import { __iconNode as bug } from 'lucide-react/dist/esm/icons/bug.js';
import { __iconNode as list } from 'lucide-react/dist/esm/icons/list.js';
import { __iconNode as quote } from 'lucide-react/dist/esm/icons/quote.js';
import { __iconNode as chevronDown } from 'lucide-react/dist/esm/icons/chevron-down.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Obsidian's 13 callout types, each with the aliases it accepts. Colour is chosen in CSS
// from data-callout-kind, with Arc semantic tokens only.
const KINDS = {
  note: { aliases: [], icon: pencil },
  abstract: { aliases: ['summary', 'tldr'], icon: clipboardList },
  info: { aliases: [], icon: info },
  todo: { aliases: [], icon: circleCheck },
  tip: { aliases: ['hint', 'important'], icon: flame },
  success: { aliases: ['check', 'done'], icon: check },
  question: { aliases: ['help', 'faq'], icon: circleHelp },
  warning: { aliases: ['caution', 'attention'], icon: triangleAlert },
  failure: { aliases: ['fail', 'missing'], icon: x },
  danger: { aliases: ['error'], icon: zap },
  bug: { aliases: [], icon: bug },
  example: { aliases: [], icon: list },
  quote: { aliases: ['cite'], icon: quote },
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

const buildSvg = (iconNode, size) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  };
  Object.entries(attrs).forEach(([name, value]) => svg.setAttribute(name, String(value)));
  iconNode.forEach(([tag, props]) => {
    const child = document.createElementNS(SVG_NS, tag);
    Object.entries(props).filter(([name]) => name !== 'key').forEach(([name, value]) => child.setAttribute(name, String(value)));
    svg.append(child);
  });
  return svg;
};

const ICON_SIZE = 18;

export const createCalloutIcon = (type) => buildSvg(KINDS[calloutKind(type)].icon, ICON_SIZE);
export const createFoldIcon = () => buildSvg(chevronDown, ICON_SIZE);

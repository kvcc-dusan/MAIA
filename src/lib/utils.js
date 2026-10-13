import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"
// Priority colour, as a token reference rather than a hex literal, so it
// follows the theme. `--priority-*` are emitted as real custom properties
// (they live on :root, not in `@theme inline`), so this is valid inside an
// inline style. Both the p1/p2/p3 and high/medium/low spellings are accepted —
// the app uses each in different places.
const PRIORITY_TOKENS = {
  p1: 'var(--priority-1)', high: 'var(--priority-1)',
  p2: 'var(--priority-2)', medium: 'var(--priority-2)',
  p3: 'var(--priority-3)', low: 'var(--priority-3)',
};

// tailwind-merge can't infer custom theme keys, so every custom utility we add
// has to be registered here or `cn()` will keep both sides of a conflict.
// Add to this list whenever a new named token lands in styles/tokens.css.
const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            'z-index': [
                'z-sticky', 'z-dock', 'z-drawer', 'z-overlay',
                'z-dialog', 'z-popover', 'z-tooltip', 'z-toast',
            ],
            'shadow': ['shadow-ambient', 'shadow-raised', 'shadow-overlay', 'shadow-glass'],
        },
    },
});

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function countWords(text) {
  const tokens = text.split(/\s+/).filter(t => t.length > 0);
  return tokens.filter(t => /[\p{L}\p{N}]/u.test(t)).length;
}

export const getPriorityColor = (p) => PRIORITY_TOKENS[p] ?? PRIORITY_TOKENS.p3;

/** Softened variant of the same token, for glows and chip backgrounds. */
export const getPriorityTint = (p, percent = 40) =>
  `color-mix(in oklch, ${getPriorityColor(p)} ${percent}%, transparent)`;

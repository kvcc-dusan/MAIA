import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"
import { NEON_BLUE, NEON_ORANGE, NEON_GREEN } from "./constants"

const twMerge = extendTailwindMerge({
    extend: {
        classGroups: {
            'font-size': [
                'text-fluid-3xs', 'text-fluid-2xs', 'text-fluid-xs', 'text-fluid-sm',
                'text-fluid-base', 'text-fluid-lg', 'text-fluid-xl', 'text-fluid-2xl', 'text-fluid-3xl',
            ],
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

export const getOrdinalSuffix = (i) => {
    const j = i % 10,
        k = i % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
};

export const getPriorityColor = (p) => {
  switch (p) {
    case 'p1': return NEON_BLUE;
    case 'p2': return NEON_ORANGE;
    case 'p3': return NEON_GREEN;
    default: return NEON_GREEN;
  }
};

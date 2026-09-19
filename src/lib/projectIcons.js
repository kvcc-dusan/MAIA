/**
 * Project icon + accent palette data, split out of ProjectIcon.jsx so that
 * file can be a pure component module (react-refresh requires components-only
 * exports; see the lint rule that used to fire on it).
 *
 * The accent values are tokens, not literals — they are user-facing picks
 * (persisted per project as the `id`), resolved to CSS colors at render time.
 * The six hues map onto the existing status/priority accents instead of
 * keeping a private second palette:
 *
 *   white → --foreground      blue → --priority-1 (indigo, hue ≈277)
 *   orange → --priority-2     green → --success
 *   amber → --warning         rose → --destructive
 */

export const ICON_COLORS = [
    { id: "white",  label: "White",   value: "var(--foreground)" },
    { id: "blue",   label: "Blue",    value: "var(--priority-1)" },
    { id: "orange", label: "Orange",  value: "var(--priority-2)" },
    { id: "green",  label: "Green",   value: "var(--success)" },
    { id: "amber",  label: "Amber",   value: "var(--warning)" },
    { id: "rose",   label: "Rose",    value: "var(--destructive)" },
];

/** Ordered icon IDs shown in the picker (6 × 10 = 60). */
export const PICKER_ICONS = [
    "code", "globe", "compass", "flag", "planet", "shield",
    "heart", "bookmark", "suitcase", "creditcard", "chartline", "checkbox",
    "bulb", "coffee", "cupcake", "leaf", "sun", "waterdrop",
    "firstaid", "shuffle", "show", "reload", "package", "radio",
    "users", "wavycheck", "wavy", "circle", "square", "triangle",
    "view_3d", "rotate_3d", "activity", "ai_brain", "airplane", "barns",
    "biscuit", "building", "china_temple", "claude", "constellation", "truck",
    "global", "laurel", "money_bag", "mortar", "origami", "perplexity",
    "plant", "receipt", "satellite", "saturn", "basket", "sticker",
    "study_lamp", "telescope", "tree_palm", "yoga",
];

export const ICON_PRESETS = PICKER_ICONS;

/** colorId (persisted) → a CSS color string usable in inline styles. */
export function resolveColor(colorId) {
    if (!colorId || colorId === 'white') return 'var(--foreground)';
    const found = ICON_COLORS.find(c => c.id === colorId);
    return found ? found.value : 'var(--foreground)';
}

/**
 * Fade any CSS color (including `var(--…)` strings) to an alpha — the inline
 * styles here used to do `${accent}18` hex-alpha suffixing, which only works
 * on 6-digit hex and broke the moment accents became tokens.
 */
export function fade(cssColor, pct) {
    return `color-mix(in srgb, ${cssColor} ${pct}%, transparent)`;
}

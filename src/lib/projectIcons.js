/**
 * Project icon and colour choices, split out of ProjectIcon.jsx so that file stays components-only
 * (react-refresh). Colours are Arc's accent hues (styles/accent-hues.css), persisted per project by `id`
 * and resolved to CSS at render time. "white" is the neutral choice; the id stays for existing projects.
 */

export const ICON_COLORS = [
    { id: "white",  label: "Neutral", value: "var(--foreground)" },
    { id: "violet", label: "Violet",  value: "var(--hue-violet)" },
    { id: "blue",   label: "Blue",    value: "var(--hue-blue)" },
    { id: "green",  label: "Green",   value: "var(--hue-green)" },
    { id: "amber",  label: "Amber",   value: "var(--hue-amber)" },
    { id: "orange", label: "Orange",  value: "var(--hue-orange)" },
    { id: "coral",  label: "Coral",   value: "var(--hue-coral)" },
    { id: "rose",   label: "Rose",    value: "var(--hue-rose)" },
];

/**
 * The 24 icons the picker offers, Solar (Linear), in the order Dušan picked them (2026-10-13).
 * Ids are persisted, labels are the accessible names.
 * Older ids stay renderable through projectIcon/icons.js, so existing projects keep their icon.
 */
export const PICKER_ICONS = [
    { id: "code", label: "Code" },
    { id: "cpu", label: "Hardware" },
    { id: "cloud", label: "Cloud" },
    { id: "command", label: "Command" },
    { id: "infinity", label: "Infinity" },
    { id: "bolt", label: "Energy" },
    { id: "blackhole", label: "Black hole" },
    { id: "palette", label: "Design" },
    { id: "ruler", label: "Drafting" },
    { id: "tuning", label: "Color tuning" },
    { id: "figma", label: "Figma" },
    { id: "pen", label: "Writing" },
    { id: "growth", label: "Growth" },
    { id: "telescope", label: "Research" },
    { id: "bulb", label: "Idea" },
    { id: "wallet", label: "Finance" },
    { id: "team", label: "Team" },
    { id: "company", label: "Company" },
    { id: "pulse", label: "Health" },
    { id: "heart", label: "Heart" },
    { id: "place", label: "Place" },
    { id: "tea", label: "Tea" },
    { id: "earth", label: "Earth" },
    { id: "satellite", label: "Satellite" },
];

/** colorId (persisted) → a CSS color string usable in inline styles. */
export function resolveColor(colorId) {
    if (!colorId || colorId === 'white') return 'var(--foreground)';
    const found = ICON_COLORS.find(c => c.id === colorId);
    return found ? found.value : 'var(--foreground)';
}

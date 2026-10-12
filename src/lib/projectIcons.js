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
 * The 24 icons the picker offers, Solar (Linear), in four rows of six:
 * building, making and thinking, work, and life. Ids are persisted, labels are the accessible names.
 * Older ids stay renderable through projectIcon/icons.js, so existing projects keep their icon.
 */
export const PICKER_ICONS = [
    { id: "code", label: "Code" },
    { id: "cpu", label: "Hardware" },
    { id: "database", label: "Data" },
    { id: "magic", label: "AI and automation" },
    { id: "rocket", label: "Launch" },
    { id: "target", label: "Goal" },
    { id: "palette", label: "Design" },
    { id: "pen", label: "Writing" },
    { id: "bulb", label: "Idea" },
    { id: "chat", label: "Brainstorm" },
    { id: "search", label: "Research" },
    { id: "lab", label: "Experiment" },
    { id: "briefcase", label: "Work" },
    { id: "chart", label: "Analytics" },
    { id: "notebook", label: "Notes" },
    { id: "team", label: "Team" },
    { id: "wallet", label: "Finance" },
    { id: "shop", label: "Shop" },
    { id: "home", label: "Home" },
    { id: "heart", label: "Health" },
    { id: "leaf", label: "Nature" },
    { id: "planet", label: "Space" },
    { id: "world", label: "Travel" },
    { id: "game", label: "Play" },
];

/** colorId (persisted) → a CSS color string usable in inline styles. */
export function resolveColor(colorId) {
    if (!colorId || colorId === 'white') return 'var(--foreground)';
    const found = ICON_COLORS.find(c => c.id === colorId);
    return found ? found.value : 'var(--foreground)';
}

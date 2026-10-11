import React from "react";
import { resolveColor } from "@/lib/projectIcons.js";
import { ICONS } from "./projectIcon/icons.js";

/**
 * A project's glyph. `name` is the persisted icon id (unknown ids fall back to
 * `code`); `color` is the persisted accent id, resolved to a CSS color here.
 * The picker lives in projectIcon/IconPicker.jsx.
 */
export default function ProjectIcon({ name, size = 20, color, className = "" }) {
    const icon = ICONS[name] || ICONS.code;
    const strokeColor = color ? resolveColor(color) : undefined;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            style={strokeColor ? { color: strokeColor } : undefined}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            dangerouslySetInnerHTML={{ __html: icon.body }}
        />
    );
}

import React from "react";
import GlassSurface from "./GlassSurface";

// Project Icon System - 16 SVG presets
export const ICON_PRESETS = [
    "terminal", // Tech/Dev
    "cpu",      // System/Ops
    "palette",  // Design
    "quill",    // Writing
    "search",   // Research
    "heart",    // Health
    "flower",   // Mindfulness/Zen
    "briefcase",// Business
    "bulb",     // Idea/Lab
    "book",     // Learning
    "globe",    // General/World
    "flag",     // Mission
    "box",      // Archive
    "user",     // Personal
    "zap",      // Energy/Creative
    "circle"    // Neutral
];

const icons = {
    // === PRESETS ===
    terminal: (
        <path d="M4 17l6-6-6-6M12 19h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
    cpu: (
        <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    palette: (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.88 0 1.68-.18 2.42-.51.46-.21.65-.77.38-1.22-.19-.32-.29-.69-.29-1.07 0-1.21.99-2.2 2.2-2.2h.71c2.09 0 4.11-1.28 4.79-3.23.47-1.35.08-2.86-.92-3.86C20.35 8.95 20 7.42 20 6c0-2.21-1.79-4-4-4h-4z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    quill: (
        <path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 21v-4.5L15.5 21H11z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    search: (
        <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    heart: (
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    flower: (
        <path d="M12 22c4.97 0 9-4.03 9-9-9 0-9-9-9-9s0 9-9 9c0 4.97 4.03 9 9 9zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    briefcase: (
        <path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    bulb: (
        <path d="M9 21h6 M12 3a6 6 0 0 1 6 6c0 2-2 3-2 5H8c0-2-2-3-2-5a6 6 0 0 1 6-6z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    book: (
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    globe: (
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    flag: (
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    box: (
        <path d="M21 8L12 3 3 8l9 5 9-5zM3 8v10l9 5 9-5V8M12 13v10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    user: (
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    zap: (
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    circle: (
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),

    // UI Icons
    trash: (
        <path d="M3 6H5H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6M10 11L12 13L14 11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    work: (
        <path d="M20 7H4C2.9 7 2 7.9 2 9V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V9C22 7.9 21.1 7 20 7Z M16 7V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    x: (
        <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
    settings: (
        <>
            <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
    ),
    expand: (
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
    collapse: (
        <path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
};

export default function ProjectIcon({ name, size = 20, className = "" }) {
    // Fallback to 'terminal' if name not found
    const iconKey = icons[name] ? name : "terminal";
    const icon = icons[iconKey];

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            {icon}
        </svg>
    );
}

// Modern Glass Icon Picker
export function IconPicker({ currentIcon, onSelect, onClose }) {
    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm p-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-[#09090b] border border-white/10 shadow-2xl rounded-2xl p-5 space-y-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Select Icon</h3>
                        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors" aria-label="Close">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-3 w-full">
                        {ICON_PRESETS.map(iconName => {
                            const isActive = currentIcon === iconName;
                            return (
                                <button
                                    key={iconName}
                                    aria-label={iconName}
                                    onClick={() => {
                                        onSelect(iconName);
                                        onClose();
                                    }}
                                    className={`
                                        group aspect-square rounded-xl flex items-center justify-center transition-all duration-200 relative overflow-hidden
                                        ${isActive
                                            ? "bg-white text-black shadow-lg scale-105"
                                            : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white hover:scale-105 border border-white/5"
                                        }
                                    `}
                                >
                                    <ProjectIcon name={iconName} size={24} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

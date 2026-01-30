import React from "react";
import GlassSurface from "./GlassSurface";

// Project Icon System - 16 SVG presets (ChatGPT/Apple style)
export const ICON_PRESETS = [
    "terminal", "brain", "globe", "briefcase",
    "zap", "cube", "quill", "palette",
    "mic", "film", "book", "flag",
    "star", "heart", "home", "layers"
];

const icons = {
    // Utility & Legacy Icons (for Dock/UI)
    trash: (
        <path d="M3 6H5H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6M10 11L12 13L14 11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    work: (
        <path d="M20 7H4C2.9 7 2 7.9 2 9V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V9C22 7.9 21.1 7 20 7Z M16 7V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    personal: (
        <path d="M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21M12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    research: (
        <React.Fragment>
            <circle cx="11" cy="11" r="8" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M21 21L16.65 16.65" strokeWidth="1.5" strokeLinecap="round" />
        </React.Fragment>
    ),
    writing: (
        <path d="M17 3L21 7L8 20H4V16L17 3Z M13 7L17 11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    check: (
        <path d="M20 6L9 17L4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
    design: (
        <React.Fragment>
            <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
            <path d="M12 2V6M12 18V22M22 12H18M6 12H2M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" strokeWidth="1.5" strokeLinecap="round" />
        </React.Fragment>
    ),

    // Standard Preset Icons
    terminal: (
        <path d="M4 17l6-6-6-6M12 19h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
    brain: (
        <path d="M9.5 20c.8 0 1.5-.7 1.5-1.5S10.3 17 9.5 17 8 17.7 8 18.5 8.7 20 9.5 20zm5 0c.8 0 1.5-.7 1.5-1.5S15.3 17 14.5 17 13 17.7 13 18.5 13.7 20 14.5 20zM12 3c-5 0-9 4-9 9 0 2.3.8 4.4 2.2 6.1.4.5.4 1.2-.1 1.7-.5.5-.8 1.2-.8 2 0 1.1.9 2 2 2h11.4c1.1 0 2-.9 2-2 0-.8-.3-1.5-.8-2-.5-.5-.5-1.2-.1-1.7C20.2 16.4 21 14.3 21 12c0-5-4-9-9-9zm0 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    globe: (
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    briefcase: (
        <path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 5h4v2h-4V5z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    zap: (
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    cube: (
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    quill: (
        <path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 21v-4.5L15.5 21H11z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    palette: (
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.88 0 1.68-.18 2.42-.51.46-.21.65-.77.38-1.22-.19-.32-.29-.69-.29-1.07 0-1.21.99-2.2 2.2-2.2h.71c2.09 0 4.11-1.28 4.79-3.23.47-1.35.08-2.86-.92-3.86C20.35 8.95 20 7.42 20 6c0-2.21-1.79-4-4-4h-4zM6.5 11c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm4-4c-.83 0-1.5-.67-1.5-1.5S9.67 4 10.5 4s1.5.67 1.5 1.5S11.33 7 10.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S14.67 4 15.5 4s1.5.67 1.5 1.5S16.33 7 15.5 7zm4 4c-.83 0-1.5-.67-1.5-1.5S18.67 8 19.5 8 21 8.67 21 9.5 20.33 11 19.5 11z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    mic: (
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    film: (
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    book: (
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    flag: (
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    star: (
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    heart: (
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    home: (
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    layers: (
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    )
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm p-4"
                onClick={e => e.stopPropagation()}
            >
                <GlassSurface className="p-6 rounded-2xl flex flex-col items-center">
                    <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-6">Select Identity</h3>

                    <div className="grid grid-cols-4 gap-4 w-full">
                        {ICON_PRESETS.map(iconName => {
                            const isActive = currentIcon === iconName;
                            return (
                                <button
                                    key={iconName}
                                    onClick={() => {
                                        onSelect(iconName);
                                        onClose();
                                    }}
                                    className={`
                                        group aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 relative overflow-hidden
                                        ${isActive
                                            ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110"
                                            : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white hover:scale-105 border border-white/5"
                                        }
                                    `}
                                >
                                    <ProjectIcon name={iconName} size={24} />

                                    {/* Subtle active indicator */}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </GlassSurface>
            </div>
        </div>
    );
}

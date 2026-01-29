// Project Icon System - 16 SVG presets
export const ICON_PRESETS = [
    "rocket", "target", "flag", "star",
    "code", "design", "writing", "research",
    "active", "paused", "archive", "check",
    "personal", "work", "learning", "health"
];

const icons = {
    rocket: (
        <path d="M12 2L9 9L2 12L9 15L12 22L15 15L22 12L15 9L12 2Z M12 7L13.5 10.5L17 12L13.5 13.5L12 17L10.5 13.5L7 12L10.5 10.5L12 7Z" />
    ),
    target: (
        <>
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
        </>
    ),
    flag: (
        <path d="M5 22V4M5 4L19 10L5 16V4Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    star: (
        <path d="M12 2L15 8.5L22 9.5L17 14.5L18.5 21.5L12 18L5.5 21.5L7 14.5L2 9.5L9 8.5L12 2Z" strokeWidth="1.5" strokeLinejoin="round" />
    ),
    code: (
        <path d="M16 18L22 12L16 6M8 6L2 12L8 18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    design: (
        <>
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 2V6M12 18V22M22 12H18M6 12H2M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" strokeWidth="1.5" strokeLinecap="round" />
        </>
    ),
    writing: (
        <path d="M17 3L21 7L8 20H4V16L17 3Z M13 7L17 11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    research: (
        <>
            <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M21 21L16.65 16.65" strokeWidth="1.5" strokeLinecap="round" />
        </>
    ),
    active: (
        <circle cx="12" cy="12" r="10" fill="currentColor" />
    ),
    paused: (
        <>
            <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
            <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
        </>
    ),
    archive: (
        <path d="M3 6H21M5 6V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6M10 11L12 13L14 11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    check: (
        <path d="M20 6L9 17L4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
    personal: (
        <path d="M20 21V19C20 16.79 18.21 15 16 15H8C5.79 15 4 16.79 4 19V21M12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    work: (
        <path d="M20 7H4C2.9 7 2 7.9 2 9V19C2 20.1 2.9 21 4 21H20C21.1 21 22 20.1 22 19V9C22 7.9 21.1 7 20 7Z M16 7V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    learning: (
        <path d="M22 10V16M2 10L12 5L22 10L12 15L2 10Z M6 12V17C6 17 9 20 12 20C15 20 18 17 18 17V12" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
    health: (
        <path d="M20.84 4.61C19.32 3.04 17.06 3.04 15.54 4.61L12 8.69L8.46 4.61C6.94 3.04 4.68 3.04 3.16 4.61C1.61 6.23 1.61 8.77 3.16 10.39L12 20L20.84 10.39C22.39 8.77 22.39 6.23 20.84 4.61Z" strokeWidth="1.5" strokeLinejoin="round" />
    )
};

export default function ProjectIcon({ name = "rocket", size = 20, className = "" }) {
    const icon = icons[name] || icons.rocket;

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

// Icon Picker Modal
export function IconPicker({ currentIcon, onSelect, onClose }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="glass-panel w-[400px] p-6 rounded-2xl"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-white text-sm font-medium mb-4">Choose Icon</h3>
                <div className="grid grid-cols-4 gap-3">
                    {ICON_PRESETS.map(iconName => (
                        <button
                            key={iconName}
                            onClick={() => {
                                onSelect(iconName);
                                onClose();
                            }}
                            className={`
                aspect-square rounded-xl flex items-center justify-center transition-all
                ${currentIcon === iconName
                                    ? "bg-white text-black shadow-lg scale-105"
                                    : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white hover:scale-105"
                                }
              `}
                        >
                            <ProjectIcon name={iconName} size={24} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

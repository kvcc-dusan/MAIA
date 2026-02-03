// Reusable Glass Card component matching Chronos aesthetic
export function GlassCard({
    children,
    variant = "default",
    hover = true,
    className = "",
    ...props
}) {
    const variants = {
        default: "bg-white/5 border-white/5",
        elevated: "bg-white/10 border-white/10",
        dark: "bg-black/40 border-white/5"
    };

    const hoverClass = hover ? "hover:bg-white/10 transition-colors" : "";

    return (
        <div
            className={`${variants[variant]} border rounded-xl p-4 backdrop-blur-sm ${hoverClass} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

// Compact variant for list items
export function GlassListItem({
    children,
    active = false,
    className = "",
    ...props
}) {
    return (
        <div
            className={`
        border rounded-xl p-3 backdrop-blur-sm transition-colors
        ${active
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                }
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
}

// Glass input field
export function GlassInput({ className = "", ...props }) {
    return (
        <input
            className={`w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:bg-white/10 focus:border-white/20 transition-colors placeholder:text-zinc-400 ${className}`}
            {...props}
        />
    );
}

// Glass textarea
export function GlassTextarea({ className = "", ...props }) {
    return (
        <textarea
            className={`w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:bg-white/10 focus:border-white/20 transition-colors resize-none placeholder:text-zinc-400 ${className}`}
            {...props}
        />
    );
}

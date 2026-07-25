import { cn } from "@/lib/utils";

// Reusable Glass Card component matching Chronos aesthetic
export function GlassCard({
    children,
    variant = "default",
    hover = true,
    className = "",
    ...props
}) {
    const variants = {
        default: "bg-overlay-subtle border-border-subtle",
        elevated: "bg-overlay border-border",
        dark: "bg-black/40 border-border-subtle"
    };

    const hoverClass = hover ? "hover:bg-overlay transition-colors" : "";

    return (
        <div
            className={cn(
                variants[variant],
                "border rounded-xl p-4 backdrop-blur-xs",
                hoverClass,
                className
            )}
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
            className={cn(
                "border rounded-xl p-3 backdrop-blur-xs transition-colors",
                active
                    ? "bg-overlay border-border-strong text-white"
                    : "bg-overlay-subtle border-border-subtle text-muted-foreground hover:bg-overlay hover:text-white",
                className
            )}
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
            className={cn(
                "w-full bg-overlay-subtle border border-border rounded-lg p-3 text-white outline-hidden focus:bg-overlay focus:border-border-strong transition-colors placeholder:text-muted-foreground",
                className
            )}
            {...props}
        />
    );
}

// Glass textarea
export function GlassTextarea({ className = "", ...props }) {
    return (
        <textarea
            className={cn(
                "w-full bg-overlay-subtle border border-border rounded-xl p-4 text-white outline-hidden focus:bg-overlay focus:border-border-strong transition-colors resize-none placeholder:text-muted-foreground",
                className
            )}
            {...props}
        />
    );
}

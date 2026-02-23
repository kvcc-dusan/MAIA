import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   DESKTOP PILL DOCK  (md and above)
───────────────────────────────────────────── */
const DockIconButton = React.forwardRef(
    ({ icon: Icon, label, onClick, className, isActive }, ref) => {
        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                aria-label={label}
                className={cn(
                    "relative group p-2.5 sm:p-3 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center",
                    "hover:bg-white/10 transition-colors",
                    isActive ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white",
                    className
                )}
            >
                {Icon ? <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" /> : <div className="w-5 h-5 bg-red-500/20 rounded-full" />}
                <span
                    className={cn(
                        "absolute -top-10 left-1/2 -translate-x-1/2",
                        "px-2 py-1 rounded-md text-fluid-3xs font-medium uppercase tracking-widest",
                        "bg-zinc-900 border border-white/10 text-white shadow-xl backdrop-blur-md",
                        "opacity-0 group-hover:opacity-100",
                        "transition-opacity whitespace-nowrap pointer-events-none"
                    )}
                >
                    {label}
                </span>
            </motion.button>
        );
    }
);
DockIconButton.displayName = "DockIconButton";

const DesktopDock = React.forwardRef(({ items, className }, ref) => {
    return (
        <div
            ref={ref}
            className={cn("hidden md:flex fixed bottom-4 left-0 right-0 z-50 items-center justify-center pointer-events-none safe-bottom", className)}
        >
            <div className="w-fit flex items-center justify-center relative pointer-events-auto">
                <motion.div
                    className={cn(
                        "flex items-center gap-1 sm:gap-2 p-1.5 px-2 sm:p-2 sm:px-3 rounded-[20px] sm:rounded-[24px]",
                        "backdrop-blur-sm border border-white/10 shadow-lg",
                        "bg-card/80",
                        "hover:shadow-2xl transition-shadow duration-300"
                    )}
                >
                    {items.map((item, index) => (
                        item.type === 'separator' ? (
                            <div key={`sep-${index}`} className="w-[1px] h-8 bg-white/10 mx-2" />
                        ) : (
                            <DockIconButton key={item.label || index} {...item} />
                        )
                    ))}
                </motion.div>
            </div>
        </div>
    );
});
DesktopDock.displayName = "DesktopDock";

/* ─────────────────────────────────────────────
   MOBILE TAB BAR  (below md)
   Full-width, labeled, touch-optimized
───────────────────────────────────────────── */
const MobileTabBar = ({ items }) => {
    // Filter out separators and split into primary nav + tools
    const navItems = items.filter(item => item.type !== 'separator');
    // Primary tabs: first 5 non-separator items (nav pages)
    const primaryItems = navItems.slice(0, 5);
    // Secondary tools: rest (Chronos, Search)
    const toolItems = navItems.slice(5);

    return (
        <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-50"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            {/* Main tab row */}
            <div className="flex items-center bg-black/85 backdrop-blur-xl h-[var(--dock-h)]">
                {primaryItems.map((item, i) => (
                    <motion.button
                        key={item.label || i}
                        onClick={item.onClick}
                        whileTap={{ scale: 0.92 }}
                        aria-label={item.label}
                        className="flex-1 flex flex-col items-center justify-center gap-[3px] h-full min-w-[44px] transition-colors"
                    >
                        {item.icon && (
                            <item.icon
                                className={cn(
                                    "w-[19px] h-[19px] transition-all duration-200",
                                    item.isActive
                                        ? "text-white"
                                        : "text-zinc-500"
                                )}
                                strokeWidth={item.isActive ? 2.2 : 1.8}
                            />
                        )}
                        <span className={cn(
                            "text-[9px] font-medium uppercase tracking-wider leading-none transition-colors duration-200",
                            item.isActive ? "text-white" : "text-zinc-600"
                        )}>
                            {item.label}
                        </span>

                    </motion.button>
                ))}

                {/* Tool items (Chronos, Search) — rendered as icon-only mini buttons */}
                {toolItems.length > 0 && (
                    <>
                        <div className="w-[1px] h-5 bg-white/10 mx-1 flex-none" />
                        {toolItems.map((item, i) => (
                            <motion.button
                                key={item.label || i}
                                onClick={item.onClick}
                                whileTap={{ scale: 0.92 }}
                                aria-label={item.label}
                                className={cn(
                                    "flex-1 flex flex-col items-center justify-center gap-[3px] h-full min-w-[44px] transition-colors",
                                )}
                            >
                                {item.icon && (
                                    <item.icon
                                        className={cn(
                                            "w-[18px] h-[18px] transition-all duration-200",
                                            item.isActive ? "text-white" : "text-zinc-500"
                                        )}
                                        strokeWidth={item.isActive ? 2.2 : 1.8}
                                    />
                                )}
                                <span className={cn(
                                    "text-[9px] font-medium uppercase tracking-wider leading-none",
                                    item.isActive ? "text-white" : "text-zinc-600"
                                )}>
                                    {item.label}
                                </span>
                            </motion.button>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   UNIFIED Dock EXPORT
───────────────────────────────────────────── */
const Dock = React.forwardRef(({ items, className }, ref) => {
    return (
        <>
            <DesktopDock ref={ref} items={items} className={className} />
            <MobileTabBar items={items} />
        </>
    );
});
Dock.displayName = "Dock";

export { Dock };

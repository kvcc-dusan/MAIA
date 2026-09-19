import * as React from "react";
import { motion as Motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ─────────────────────────────────────────────
   DESKTOP PILL DOCK  (md and above)
───────────────────────────────────────────── */
const DockIconButton = React.forwardRef(
    ({ icon: Icon, label, onClick, className, isActive }, ref) => {
        return (
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Motion.button
                            ref={ref}
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClick}
                            aria-label={label}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                                "relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 sm:p-3",
                                "transition-colors hover:bg-accent",
                                isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
                                className
                            )}
                        >
                            {Icon
                                ? <Icon className="size-[18px] sm:size-5" strokeWidth={isActive ? 2.2 : 1.8} />
                                : <div className="size-5 rounded-full bg-destructive/20" />}
                        </Motion.button>
                    }
                />
                {/* Replaces the hand-rolled hover bubble; keeps the dock's
                    uppercase micro-label voice but inherits real positioning,
                    delay and dismissal behaviour. */}
                <TooltipContent side="top" className="uppercase tracking-widest">
                    {label}
                </TooltipContent>
            </Tooltip>
        );
    }
);
DockIconButton.displayName = "DockIconButton";

const DesktopDock = React.forwardRef(({ items, className }, ref) => {
    return (
        <div
            ref={ref}
            className={cn("safe-bottom pointer-events-none fixed inset-x-0 bottom-4 z-dock hidden items-center justify-center md:flex", className)}
        >
            <div className="pointer-events-auto relative flex w-fit items-center justify-center">
                <Motion.div
                    className={cn(
                        "flex items-center gap-1 rounded-3xl p-1.5 px-2 sm:gap-2 sm:p-2 sm:px-3",
                        "border border-border bg-glass/80 supports-backdrop-filter:backdrop-blur-xl",
                        "shadow-raised transition-shadow duration-300"
                    )}
                >
                    {items.map((item, index) => (
                        item.type === 'separator' ? (
                            <div key={`sep-${index}`} className="mx-2 h-8 w-px bg-border" />
                        ) : (
                            <DockIconButton key={item.label || index} {...item} />
                        )
                    ))}
                </Motion.div>
            </div>
        </div>
    );
});
DesktopDock.displayName = "DesktopDock";

/* ─────────────────────────────────────────────
   MOBILE TAB BAR  (below md)
───────────────────────────────────────────── */
const MobileTabBar = ({ items }) => {
    // Split on the separator rather than a hardcoded index — the old
    // `slice(0, 5)` silently mis-grouped the bar if items were reordered.
    const separatorAt = items.findIndex((item) => item.type === 'separator');
    const navItems = items.filter((item) => item.type !== 'separator');
    const splitAt = separatorAt === -1 ? navItems.length : separatorAt;
    const primaryItems = navItems.slice(0, splitAt);
    const toolItems = navItems.slice(splitAt);

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-dock md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            <div className="flex h-(--dock-h) items-center border-t border-border-subtle bg-glass/80 supports-backdrop-filter:backdrop-blur-xl">
                {primaryItems.map((item, i) => (
                    <Motion.button
                        key={item.label || i}
                        onClick={item.onClick}
                        whileTap={{ scale: 0.92 }}
                        aria-label={item.label}
                        aria-current={item.isActive ? "page" : undefined}
                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 transition-colors"
                    >
                        {item.icon && (
                            <item.icon
                                className={cn(
                                    "size-[19px] shrink-0 transition-all duration-200",
                                    item.isActive ? "text-foreground" : "text-muted-foreground"
                                )}
                                strokeWidth={item.isActive ? 2.2 : 1.8}
                            />
                        )}
                        {/* At the 12px type floor five labels no longer fit 375px
                            edge to edge; tracking-normal + truncate keeps them from
                            colliding rather than dropping below the floor again. */}
                        <span className={cn(
                            "w-full truncate text-center text-xs font-medium uppercase leading-none transition-colors duration-200",
                            item.isActive ? "text-foreground" : "text-subtle-foreground"
                        )}>
                            {item.label}
                        </span>
                    </Motion.button>
                ))}

                {/* Tools are icon-only on mobile. With the type floor raised to
                    12px, seven labelled tabs no longer fit at 375px — and the
                    aria-label still names them for assistive tech. */}
                {toolItems.length > 0 && (
                    <>
                        <div className="mx-1 h-5 w-px flex-none bg-border" />
                        {toolItems.map((item, i) => (
                            <Motion.button
                                key={item.label || i}
                                onClick={item.onClick}
                                whileTap={{ scale: 0.92 }}
                                aria-label={item.label}
                                className="flex h-full min-w-[44px] flex-none items-center justify-center px-4 transition-colors"
                            >
                                {item.icon && (
                                    <item.icon
                                        className={cn(
                                            "size-[18px] transition-all duration-200",
                                            item.isActive ? "text-foreground" : "text-muted-foreground"
                                        )}
                                        strokeWidth={item.isActive ? 2.2 : 1.8}
                                    />
                                )}
                            </Motion.button>
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

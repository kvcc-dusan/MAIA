import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const floatingAnimation = {
    initial: { y: 0 },
    animate: {
        y: [-2, 2, -2],
        transition: {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
        },
    },
};

const DockIconButton = React.forwardRef(
    ({ icon: Icon, label, onClick, className, isActive }, ref) => {
        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                className={cn(
                    "relative group p-3 rounded-xl", // rounded-xl for icons matched to 24 rounded dock
                    "hover:bg-white/10 transition-colors",
                    isActive ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white",
                    className
                )}
            >
                <Icon className="w-5 h-5" />
                <span
                    className={cn(
                        "absolute -top-10 left-1/2 -translate-x-1/2",
                        "px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-widest",
                        "bg-zinc-900 border border-white/10 text-white shadow-xl backdrop-blur-md",
                        "opacity-0 group-hover:opacity-100",
                        "transition-opacity whitespace-nowrap pointer-events-none"
                    )}
                >
                    {label}
                </span>
                {/* Active Indicator Dot */}
                {isActive && (
                    <span className="absolute -bottom-1 left-1/2 w-1 h-1 -translate-x-1/2 rounded-full bg-white/50" />
                )}
            </motion.button>
        );
    }
);
DockIconButton.displayName = "DockIconButton";

const Dock = React.forwardRef(({ items, className }, ref) => {
    return (
        <div
            ref={ref}
            className={cn("w-full flex items-center justify-center p-4", className)}
        >
            <div className="w-fit flex items-center justify-center relative">
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={floatingAnimation}
                    className={cn(
                        "flex items-center gap-2 p-2 px-3 rounded-[24px]", // The requested 24px radius
                        "backdrop-blur-sm border border-white/10 shadow-lg",
                        "bg-card/80", // Glass effect matching widgets
                        "hover:shadow-2xl transition-shadow duration-300"
                    )}
                >
                    {items.map((item) => (
                        <DockIconButton key={item.label} {...item} />
                    ))}
                </motion.div>
            </div>
        </div>
    );
});
Dock.displayName = "Dock";

export { Dock };

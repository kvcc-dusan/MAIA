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
                    "relative group p-2 sm:p-3 rounded-xl",
                    "hover:bg-white/10 transition-colors",
                    isActive ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white",
                    className
                )}
            >
                {Icon ? <Icon className="w-4 h-4 sm:w-5 sm:h-5" /> : <div className="w-4 h-4 sm:w-5 sm:h-5 bg-red-500/20 rounded-full" />}
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

const Dock = React.forwardRef(({ items, className }, ref) => {
    return (
        <div
            ref={ref}
            className={cn("fixed bottom-4 sm:bottom-6 left-0 right-0 z-50 flex items-center justify-center pointer-events-none safe-bottom", className)}
        >
            <div className="w-fit flex items-center justify-center relative pointer-events-auto">
                <motion.div
                    className={cn(
                        "flex items-center gap-1 sm:gap-2 p-1.5 px-2 sm:p-2 sm:px-3 rounded-[20px] sm:rounded-[24px]",
                        "backdrop-blur-sm border border-white/10 shadow-lg",
                        "bg-card/80", // Glass effect matching widgets
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
Dock.displayName = "Dock";

export { Dock };

import React from "react";
import { cn } from "@/lib/utils";

export default function SignalCard({ title, children, accent = "zinc" }) {
    const border = {
        zinc: "border-white/5",
        red: "border-red-500/20 bg-red-500/5",
        emerald: "border-emerald-500/20 bg-emerald-500/5",
        amber: "border-amber-500/20 bg-amber-500/5"
    }[accent] || "border-white/5";

    return (
        <div className={cn(
            "p-4 rounded-xl glass-panel mb-4 shadow-none hover:bg-white/5 transition-colors",
            border
        )}>
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">{title}</h3>
            {children}
        </div>
    );
}

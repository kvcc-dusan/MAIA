import React, { useState, useEffect, useRef } from "react";
import ProjectIcon, { IconPicker } from "./ProjectIcon";
import { X, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";

// Minimal Input Style (Shared with Ledger)
const INPUT_CLEAN = "w-full bg-transparent border-none outline-none text-zinc-200 placeholder:text-zinc-700/50 font-mono transition-all resize-none p-0 focus:ring-0";

export default function CreateProjectModal({ isOpen, onClose, onCreate }) {
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("terminal");
    const [iconColor, setIconColor] = useState("white");
    const [showPicker, setShowPicker] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setName("");
            setIcon("terminal");
            setIconColor("white");
            setShowPicker(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate({ name, icon, iconColor });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-black/90 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                    <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-white flex items-center gap-2 font-mono">
                        <FolderPlus size={14} className="text-zinc-500" />
                        New Project
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-8">
                    {/* Project Name Input (Hero Style) */}
                    <div className="flex items-start gap-4">
                        <button
                            type="button"
                            onClick={() => setShowPicker(true)}
                            className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 group"
                        >
                            <ProjectIcon name={icon} size={24} color={iconColor} className="group-hover:scale-110 transition-transform" />
                        </button>

                        <div className="flex-1 pt-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Project Name..."
                                className={cn(INPUT_CLEAN, "text-xl font-medium placeholder:text-zinc-700")}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="text-xs font-bold font-mono uppercase tracking-wider text-white hover:text-zinc-300 transition-colors"
                        >
                            Create Project
                        </button>
                    </div>
                </form>
            </div>

            {/* Nested Icon Picker */}
            {showPicker && (
                <IconPicker
                    currentIcon={icon}
                    currentColor={iconColor}
                    onSelect={(newIcon, newColor) => {
                        setIcon(newIcon);
                        setIconColor(newColor);
                        setShowPicker(false);
                    }}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </div>
    );
}

import React, { useState, useEffect, useRef } from "react";
import ProjectIcon, { IconPicker } from "./ProjectIcon";
import { CancelSquare as X, FolderAdd as FolderPlus } from "./ui/CustomIcon.jsx";
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
                className="w-full max-w-md mx-4 bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                    <span className="text-fluid-3xs uppercase tracking-[0.15em] text-zinc-500 font-bold font-mono">
                        New Project
                    </span>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 hover:bg-white/[0.06] hover:text-zinc-300 transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    {/* Icon + Name row */}
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setShowPicker(true)}
                            className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all shrink-0"
                            title="Choose icon"
                        >
                            <ProjectIcon name={icon} size={20} color={iconColor} />
                        </button>

                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Escape' && onClose()}
                            placeholder="Project name..."
                            className="flex-1 bg-transparent outline-none text-white text-base font-medium placeholder:text-zinc-700 font-mono"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-[0.12em] bg-white/[0.07] border border-white/[0.12] text-white hover:bg-white/[0.12] transition-colors"
                        >
                            Create
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

import React, { useState, useEffect, useRef } from "react";
import GlassSurface from "./GlassSurface";
import ProjectIcon, { IconPicker } from "./ProjectIcon";

export default function CreateProjectModal({ isOpen, onClose, onCreate }) {
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("terminal");
    const [showPicker, setShowPicker] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setName("");
            setIcon("terminal"); // Default
            setShowPicker(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate({ name, icon });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md p-4">
                <GlassSurface className="p-6 md:p-8 rounded-2xl relative z-10">
                    <h2 className="text-xl font-bold text-white mb-6 font-mono tracking-tight text-center">Inception Protocol</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                className="w-14 h-14 flex items-center justify-center text-zinc-400 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all shadow-sm group"
                                onClick={() => setShowPicker(true)}
                            >
                                <ProjectIcon name={icon} size={28} className="group-hover:scale-110 transition-transform" />
                            </button>
                            <input
                                ref={inputRef}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Project Name..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-zinc-600 outline-none focus:border-white/20 transition-all font-mono"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl border border-white/5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors font-mono text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors font-mono text-sm"
                            >
                                Initialize
                            </button>
                        </div>
                    </form>
                </GlassSurface>
            </div>

            {/* Nested Icon Picker */}
            {showPicker && (
                <IconPicker
                    currentIcon={icon}
                    onSelect={(newIcon) => {
                        setIcon(newIcon);
                        setShowPicker(false);
                    }}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </div>
    );
}

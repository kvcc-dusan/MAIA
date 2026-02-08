import React, { useState, useEffect, useRef } from "react";
import GlassSurface from "./GlassSurface";
import { X } from "lucide-react"; import ProjectIcon, { IconPicker } from "./ProjectIcon";

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
                <div className="bg-[#09090b] border border-white/10 shadow-2xl rounded-2xl p-5 space-y-5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">New Mission</h2>
                        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPicker(true)}
                                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                >
                                    <ProjectIcon name={icon} size={20} />
                                </button>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Mission Name..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:bg-white/10 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="py-2.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
                            >
                                Create Mission
                            </button>
                        </div>
                    </form>
                </div>
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

import React from 'react';
import ProjectIcon, { IconPicker } from "../../../components/ProjectIcon";
import ProjectVitality from "./ProjectVitality";
import ActivitySummary from "./ActivitySummary";
import { MoreVertical, ChevronDown, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

export default function ProjectIdentity({ project, updateProject, onDelete }) {
    const [showIconPicker, setShowIconPicker] = React.useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-6">
                <button
                    onClick={() => setShowIconPicker(true)}
                    className="w-16 h-16 flex items-center justify-center rounded-2xl text-white hover:scale-105 transition-all shadow-2xl group border border-white/10 relative overflow-hidden shrink-0"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ProjectIcon name={project.icon} size={32} color={project.iconColor} className="opacity-80 group-hover:opacity-100 transition-all group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <ProjectVitality project={project} />
                        <ActivitySummary project={project} />
                    </div>

                    <input
                        value={project.name}
                        onChange={e => updateProject(project.id, { name: e.target.value })}
                        className="bg-transparent text-fluid-xl lg:text-fluid-2xl font-bold font-sans text-white w-full outline-none placeholder:text-zinc-700 tracking-tight"
                        placeholder="Mission Name"
                    />
                </div>

                {/* Settings Menu (replaces floating dropdown) */}
                <div className="relative">
                    <button
                        onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
                        title="Project settings"
                    >
                        <MoreVertical size={18} />
                    </button>

                    {showSettingsMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />
                            <div className="absolute top-full right-0 mt-2 w-44 bg-[#09090b] border border-white/10 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                {/* Phase Selector */}
                                <div className="px-3 py-1.5">
                                    <span className="text-fluid-3xs uppercase tracking-widest text-zinc-600 font-bold">Phase</span>
                                </div>
                                {['Active', 'Paused', 'Done'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            updateProject(project.id, { status });
                                            setShowSettingsMenu(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                            project.status === status ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        {status === 'Done' ? 'Archived' : status}
                                    </button>
                                ))}

                                <div className="h-px bg-white/5 my-1" />

                                {/* Delete */}
                                <button
                                    onClick={() => {
                                        onDelete(project.id);
                                        setShowSettingsMenu(false);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={12} />
                                    Delete Project
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showIconPicker && (
                <IconPicker
                    currentIcon={project.icon}
                    currentColor={project.iconColor}
                    onSelect={(newIcon, newColor) => updateProject(project.id, { icon: newIcon, iconColor: newColor })}
                    onClose={() => setShowIconPicker(false)}
                />
            )}
        </div>
    );
}

import React from 'react';
import ProjectIcon, { IconPicker } from "../../../components/ProjectIcon";
import ProjectVitality from "./ProjectVitality";
import { Plus, Play, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export default function ProjectIdentity({ project, updateProject, onDelete }) {
    const [showIconPicker, setShowIconPicker] = React.useState(false);
    const [showStatusMenu, setShowStatusMenu] = React.useState(false);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-6">
                <button
                    onClick={() => setShowIconPicker(true)}
                    className="w-16 h-16 flex items-center justify-center rounded-2xl text-white hover:scale-105 transition-all shadow-2xl group border border-white/10 relative overflow-hidden shrink-0"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <ProjectIcon name={project.icon} size={32} className="opacity-80 group-hover:opacity-100 transition-all group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <ProjectVitality project={project} />
                    </div>

                    <input
                        value={project.name}
                        onChange={e => updateProject(project.id, { name: e.target.value })}
                        className="bg-transparent text-4xl font-bold font-sans text-white w-full outline-none placeholder:text-zinc-700 tracking-tight"
                        placeholder="Mission Name"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group/status">
                        <button
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#09090b] border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all outline-none"
                        >
                            <span className="text-xs font-medium text-white">{project.status} Phase</span>
                            <ChevronDown size={10} className="text-zinc-500" />
                        </button>

                        {showStatusMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                                <div className="absolute top-full right-0 mt-2 w-32 bg-[#09090b] border border-white/10 rounded-xl shadow-2xl p-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    {['Active', 'Paused', 'Done'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => {
                                                updateProject(project.id, { status });
                                                setShowStatusMenu(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                project.status === status ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            {status === 'Done' ? 'Archived' : status}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => onDelete(project.id)}
                        className="p-2 text-zinc-600 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                        title="Archive/Delete"
                    >
                        <ProjectIcon name="trash" size={16} />
                    </button>
                </div>
            </div>

            {showIconPicker && (
                <IconPicker
                    currentIcon={project.icon}
                    onSelect={(newIcon) => updateProject(project.id, { icon: newIcon })}
                    onClose={() => setShowIconPicker(false)}
                />
            )}
        </div>
    );
}

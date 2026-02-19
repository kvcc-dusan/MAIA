import React from 'react';
import { useData } from "../../../context/DataContext";
import { Target, AlertCircle, Clock, Plus, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ProjectResume — Layer 1
 * The psychological anchor of Opus.
 * Shows: Next Decisive Action + Open Loops
 */
export default function ProjectResume({ project }) {
    const { tasks, updateTask, setNextAction, toggleTask, addTask } = useData();
    const [showAddAction, setShowAddAction] = React.useState(false);
    const [newActionTitle, setNewActionTitle] = React.useState("");

    const projectTasks = tasks.filter(t => t.projectId === project.id);

    // Next Action: explicit isNextAction flag, must be undone
    const nextAction = projectTasks.find(t => t.isNextAction && !t.done);

    // Open Loops
    const now = Date.now();
    const STALE_DAYS = 7;
    const openLoops = projectTasks.filter(t => {
        if (t.done) return false;
        if (t.isNextAction) return false; // Already shown above
        if (t.status === 'blocked') return true;
        // Stale: created > 7 days ago, still open
        const age = (now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (age > STALE_DAYS) return true;
        return false;
    }).slice(0, 5);

    const blockedCount = projectTasks.filter(t => !t.done && t.status === 'blocked').length;

    const handleCreateNextAction = () => {
        if (!newActionTitle.trim()) return;
        const taskId = addTask(newActionTitle, null, "", project.id, { isNextAction: true });
        setNewActionTitle("");
        setShowAddAction(false);
    };

    const handleCompleteNextAction = () => {
        if (!nextAction) return;
        toggleTask(nextAction.id);
        // Auto-clear isNextAction on completion
        updateTask(nextAction.id, { isNextAction: false });
    };

    const handlePromoteToNext = (taskId) => {
        setNextAction(taskId, project.id);
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = now - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ─── NEXT DECISIVE ACTION ─── */}
            <div className={cn(
                "rounded-2xl border shadow-2xl p-6 transition-all",
                nextAction
                    ? "bg-black border-[#93FD23]/20 shadow-[0_0_30px_rgba(147,253,35,0.05)]"
                    : "bg-black border-white/10"
            )}>
                <div className="flex items-center gap-2 mb-4">
                    <Target size={14} className={nextAction ? "text-[#93FD23]" : "text-zinc-600"} />
                    <span className="text-fluid-3xs uppercase tracking-widest text-zinc-500 font-bold">
                        Next Decisive Action
                    </span>
                </div>

                {nextAction ? (
                    <div className="flex items-start gap-4">
                        {/* Complete Button */}
                        <button
                            onClick={handleCompleteNextAction}
                            className="mt-1 w-5 h-5 rounded-full border-2 border-[#93FD23]/40 hover:border-[#93FD23] hover:bg-[#93FD23]/10 transition-all shrink-0 flex items-center justify-center group"
                        >
                            <div className="w-2 h-2 rounded-full bg-[#93FD23]/0 group-hover:bg-[#93FD23]/60 transition-all" />
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="text-lg font-medium text-white mb-1">
                                {nextAction.title}
                            </div>
                            <div className="flex items-center gap-3 text-fluid-3xs font-mono text-zinc-600">
                                {nextAction.status === 'blocked' && (
                                    <span className="text-red-400 flex items-center gap-1">
                                        <AlertCircle size={10} />
                                        Blocked
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Clock size={10} />
                                    {formatTimeAgo(nextAction.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Empty CTA */
                    showAddAction ? (
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-zinc-700 shrink-0" />
                            <input
                                autoFocus
                                value={newActionTitle}
                                onChange={e => setNewActionTitle(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleCreateNextAction();
                                    if (e.key === 'Escape') { setShowAddAction(false); setNewActionTitle(""); }
                                }}
                                onBlur={() => { if (!newActionTitle.trim()) setShowAddAction(false); }}
                                placeholder="What's the one thing to do next?"
                                className="flex-1 bg-transparent text-lg text-white placeholder:text-zinc-700 outline-none"
                            />
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddAction(true)}
                            className="flex items-center gap-3 text-zinc-600 hover:text-zinc-400 transition-colors w-full group"
                        >
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-zinc-500 flex items-center justify-center transition-colors">
                                <Plus size={10} />
                            </div>
                            <span className="text-sm italic">Define next decisive action</span>
                        </button>
                    )
                )}
            </div>

            {/* ─── OPEN LOOPS ─── */}
            {openLoops.length > 0 && (
                <div className="mt-4 px-2">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-fluid-3xs uppercase tracking-widest text-zinc-600 font-bold">
                            Open Loops
                        </span>
                        {blockedCount > 0 && (
                            <span className="text-fluid-3xs font-mono text-red-400/80 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/10">
                                {blockedCount} blocked
                            </span>
                        )}
                    </div>

                    <div className="space-y-1">
                        {openLoops.map(task => (
                            <div
                                key={task.id}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                                {task.status === 'blocked' ? (
                                    <AlertCircle size={12} className="text-red-400 shrink-0" />
                                ) : (
                                    <Clock size={12} className="text-zinc-700 shrink-0" />
                                )}
                                <span className={cn(
                                    "text-sm flex-1 truncate",
                                    task.status === 'blocked' ? "text-zinc-400" : "text-zinc-600"
                                )}>
                                    {task.title}
                                </span>
                                <button
                                    onClick={() => handlePromoteToNext(task.id)}
                                    className="opacity-0 group-hover:opacity-100 text-fluid-3xs text-zinc-600 hover:text-[#93FD23] transition-all flex items-center gap-1"
                                    title="Set as next action"
                                >
                                    <ChevronRight size={10} />
                                    <span>Next</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

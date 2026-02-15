import React, { useState } from 'react';
import { useData } from "../../../context/DataContext";
import { Plus, Circle, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Target, X, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ExecutionPanel — Layer 2
 * Structured task groups: Next Action, In Progress, Blocked, Backlog, Completed
 */
export default function ExecutionPanel({ project }) {
    const { tasks, addTask, toggleTask, updateTask, deleteTask, setNextAction } = useData();
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [expandedGroups, setExpandedGroups] = useState({
        completed: false,
    });
    const [contextMenu, setContextMenu] = useState(null); // { taskId, x, y }

    const projectTasks = tasks.filter(t => t.projectId === project.id);

    // Group tasks
    const nextAction = projectTasks.filter(t => t.isNextAction && !t.done);
    const blocked = projectTasks.filter(t => !t.done && !t.isNextAction && t.status === 'blocked');
    const inProgress = projectTasks.filter(t => !t.done && !t.isNextAction && t.status !== 'blocked');
    const completed = projectTasks.filter(t => t.done);

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) return;
        addTask(newTaskTitle, null, "", project.id);
        setNewTaskTitle("");
    };

    const toggleGroup = (group) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const handleContextAction = (action, taskId) => {
        switch (action) {
            case 'next':
                setNextAction(taskId, project.id);
                break;
            case 'block':
                updateTask(taskId, { status: 'blocked' });
                break;
            case 'unblock':
                updateTask(taskId, { status: null });
                break;
            case 'unnext':
                updateTask(taskId, { isNextAction: false });
                break;
            case 'delete':
                deleteTask(taskId);
                break;
        }
        setContextMenu(null);
    };

    const TaskRow = ({ task, showPromote = false }) => (
        <div
            className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors relative"
            onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ taskId: task.id, x: e.clientX, y: e.clientY });
            }}
        >
            <button
                onClick={() => toggleTask(task.id)}
                className={cn(
                    "transition-colors shrink-0",
                    task.done ? "text-zinc-600" : task.status === 'blocked' ? "text-red-400" : "text-zinc-600 hover:text-[#93FD23]"
                )}
            >
                {task.done ? <CheckCircle2 size={16} /> : task.status === 'blocked' ? <AlertCircle size={16} /> : <Circle size={16} />}
            </button>

            <div className="flex-1 min-w-0">
                <span className={cn(
                    "text-sm truncate block",
                    task.done ? "text-zinc-700 line-through" : task.status === 'blocked' ? "text-zinc-400" : "text-zinc-300 group-hover:text-white"
                )}>
                    {task.title}
                </span>
                {task.due && !task.done && (
                    <span className="text-[10px] text-zinc-600 font-mono">
                        Due {new Date(task.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>

            {task.isNextAction && (
                <Target size={12} className="text-[#93FD23] shrink-0" />
            )}
        </div>
    );

    const GroupHeader = ({ label, count, icon: Icon, color, groupKey, defaultOpen = true }) => {
        const isOpen = groupKey ? (expandedGroups[groupKey] ?? defaultOpen) : true;
        return (
            <button
                onClick={() => groupKey && toggleGroup(groupKey)}
                className={cn(
                    "flex items-center gap-2 w-full py-2 px-1 text-left",
                    groupKey && "cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                )}
            >
                {groupKey && (
                    isOpen ? <ChevronDown size={12} className="text-zinc-600" /> : <ChevronRight size={12} className="text-zinc-600" />
                )}
                {Icon && <Icon size={12} className={color || "text-zinc-600"} />}
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                    {label}
                </span>
                <span className="text-[10px] text-zinc-700 font-mono">
                    {count}
                </span>
            </button>
        );
    };

    return (
        <div className="rounded-2xl bg-black border border-white/10 shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2">
                    <span className="w-1 h-1 bg-zinc-500 rounded-full" />
                    Execution
                </h3>
            </div>

            {/* Quick Add */}
            <div className="relative group/add mb-4">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Plus size={14} className="text-zinc-600 group-focus-within/add:text-zinc-400 transition-colors" />
                </div>
                <input
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                    className="w-full bg-white/5 hover:bg-white/8 focus:bg-white/8 border border-white/5 focus:border-white/15 rounded-xl py-2.5 pl-9 pr-4 text-sm text-zinc-200 placeholder:text-zinc-700 outline-none transition-all"
                    placeholder="Add task..."
                />
            </div>

            {/* Task Groups */}
            <div className="space-y-2">
                {/* Next Action */}
                {nextAction.length > 0 && (
                    <div>
                        <GroupHeader label="Next Action" count={nextAction.length} icon={Target} color="text-[#93FD23]" />
                        {nextAction.map(t => <TaskRow key={t.id} task={t} />)}
                    </div>
                )}

                {/* Blocked */}
                {blocked.length > 0 && (
                    <div>
                        <GroupHeader label="Blocked" count={blocked.length} icon={AlertCircle} color="text-red-400" />
                        {blocked.map(t => <TaskRow key={t.id} task={t} />)}
                    </div>
                )}

                {/* Backlog (In Progress + remaining) */}
                {inProgress.length > 0 && (
                    <div>
                        <GroupHeader label="Backlog" count={inProgress.length} />
                        {inProgress.map(t => <TaskRow key={t.id} task={t} />)}
                    </div>
                )}

                {/* Completed */}
                {completed.length > 0 && (
                    <div>
                        <GroupHeader
                            label="Completed"
                            count={completed.length}
                            icon={CheckCircle2}
                            groupKey="completed"
                            defaultOpen={false}
                        />
                        {(expandedGroups.completed ?? false) && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                {completed.map(t => <TaskRow key={t.id} task={t} />)}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {projectTasks.length === 0 && (
                    <div className="py-8 text-center text-zinc-700 text-xs italic">
                        No tasks yet. Add one above.
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
                    <div
                        className="fixed z-50 w-40 bg-[#09090b] border border-white/10 rounded-xl shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        {(() => {
                            const task = projectTasks.find(t => t.id === contextMenu.taskId);
                            if (!task) return null;
                            return (
                                <>
                                    {!task.done && !task.isNextAction && (
                                        <button
                                            onClick={() => handleContextAction('next', task.id)}
                                            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                                        >
                                            <Target size={12} /> Set as Next Action
                                        </button>
                                    )}
                                    {task.isNextAction && (
                                        <button
                                            onClick={() => handleContextAction('unnext', task.id)}
                                            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                                        >
                                            <X size={12} /> Remove Next Action
                                        </button>
                                    )}
                                    {!task.done && task.status !== 'blocked' && (
                                        <button
                                            onClick={() => handleContextAction('block', task.id)}
                                            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                                        >
                                            <Ban size={12} /> Mark Blocked
                                        </button>
                                    )}
                                    {task.status === 'blocked' && (
                                        <button
                                            onClick={() => handleContextAction('unblock', task.id)}
                                            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white flex items-center gap-2"
                                        >
                                            <Circle size={12} /> Unblock
                                        </button>
                                    )}
                                    <div className="h-px bg-white/5 my-1" />
                                    <button
                                        onClick={() => handleContextAction('delete', task.id)}
                                        className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                    >
                                        <X size={12} /> Delete
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                </>
            )}
        </div>
    );
}

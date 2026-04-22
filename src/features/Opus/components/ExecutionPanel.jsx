import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from "../../../context/DataContext";
import { PlusSignSquare as Plus, Circle, Target02 as Target, CancelSquare as X, Unavailable as Ban, Calendar03 as Calendar, Clock01 as Clock, Layers01 as Layers, ArrowDown01 as ChevronDown, ChevronRight } from "../../../components/ui/CustomIcon.jsx";
import { cn } from "@/lib/utils";

const SCHED_ORDER = { today: 0, soon: 1, future: 2 };
const sortFIFO = (arr) => [...arr].sort((a, b) => {
    const sd = (SCHED_ORDER[a.schedule] ?? 0) - (SCHED_ORDER[b.schedule] ?? 0);
    return sd !== 0 ? sd : new Date(a.createdAt) - new Date(b.createdAt);
});

export default function ExecutionPanel({ project }) {
    const { tasks, addTask, toggleTask, updateTask, deleteTask, setNextAction } = useData();
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [expandedGroups, setExpandedGroups] = useState({
        today: true, soon: true, future: false, blocked: true, done: false,
    });
    const [contextMenu, setContextMenu] = useState(null);

    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const nowTask   = projectTasks.find(t => t.isNextAction && !t.done);
    const today     = sortFIFO(projectTasks.filter(t => !t.done && !t.isNextAction && t.status !== 'blocked' && (!t.schedule || t.schedule === 'today')));
    const soon      = sortFIFO(projectTasks.filter(t => !t.done && !t.isNextAction && t.status !== 'blocked' && t.schedule === 'soon'));
    const future    = sortFIFO(projectTasks.filter(t => !t.done && !t.isNextAction && t.status !== 'blocked' && t.schedule === 'future'));
    const blocked   = projectTasks.filter(t => !t.done && !t.isNextAction && t.status === 'blocked');
    const completed = projectTasks.filter(t => t.done);

    // Track previous lengths to detect 0→N transitions
    const prevLengths = React.useRef({ today: today.length, soon: soon.length, future: future.length });

    useEffect(() => {
        const prev = prevLengths.current;
        setExpandedGroups(g => {
            const next = { ...g };
            // Collapse when empty
            if (today.length === 0)  next.today  = false;
            if (soon.length === 0)   next.soon   = false;
            if (future.length === 0) next.future = false;
            // Expand when first task appears
            if (today.length > 0  && prev.today  === 0) next.today  = true;
            if (soon.length > 0   && prev.soon   === 0) next.soon   = true;
            if (future.length > 0 && prev.future === 0) next.future = true;
            return next;
        });
        prevLengths.current = { today: today.length, soon: soon.length, future: future.length };
    }, [today.length, soon.length, future.length]);

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) return;
        const hasNextAction = projectTasks.some(t => t.isNextAction && !t.done);
        addTask(newTaskTitle, null, "", project.id, hasNextAction ? {} : { isNextAction: true });
        setNewTaskTitle("");
    };

    const toggleGroup = (key) =>
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

    const openContextMenu = (e, taskId) => {
        e.preventDefault();
        e.stopPropagation();
        const W = 192;
        const vw = window.innerWidth, vh = window.innerHeight;
        let x = e.clientX + 8;
        let y = e.clientY - 8;
        if (x + W > vw - 8) x = e.clientX - W - 8;
        if (y + 260 > vh - 8) y = vh - 268;
        setContextMenu({ taskId, x, y });
    };

    const closeMenu = () => setContextMenu(null);

    const handleContextAction = (action, taskId) => {
        switch (action) {
            case 'next':         setNextAction(taskId, project.id); break;
            case 'unnext':       updateTask(taskId, { isNextAction: false }); break;
            case 'block':        updateTask(taskId, { status: 'blocked' }); break;
            case 'unblock':      updateTask(taskId, { status: null }); break;
            case 'sched-today':  updateTask(taskId, { schedule: 'today' }); break;
            case 'sched-soon':   updateTask(taskId, { schedule: 'soon' }); break;
            case 'sched-future': updateTask(taskId, { schedule: 'future' }); break;
            case 'delete':       deleteTask(taskId); break;
        }
        closeMenu();
    };

    return (
        <div className="rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">

            {/* ── Header ── */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
                <Target size={12} className="text-zinc-600" />
                <h3 className="text-fluid-3xs uppercase tracking-[0.15em] text-zinc-500 font-bold font-mono">
                    Execution
                </h3>
            </div>

            {/* ── Next Move zone ── */}
            <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
                {nowTask ? (
                    <div
                        className="cursor-default select-none group/now"
                        onContextMenu={e => openContextMenu(e, nowTask.id)}
                    >
                        {/* Caption */}
                        <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-600 font-bold font-mono mb-2.5">
                            Next Move
                        </div>
                        {/* Title row — title left-aligned, circle on right */}
                        <div className="flex items-center gap-3">
                            <span className="flex-1 min-w-0 text-[17px] text-white font-medium leading-snug truncate">
                                {nowTask.title}
                            </span>
                            <button
                                onClick={() => toggleTask(nowTask.id)}
                                className="w-5 h-5 rounded-full border border-zinc-600 hover:border-white hover:bg-white/10 transition-all shrink-0 flex items-center justify-center group/cb opacity-0 group-hover/now:opacity-100"
                                title="Mark complete"
                            >
                                <div className="w-2 h-2 rounded-full bg-transparent group-hover/cb:bg-white/60 transition-all" />
                            </button>
                        </div>
                    </div>
                ) : (
                    (today.length > 0 || soon.length > 0 || future.length > 0) && (
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 shrink-0" />
                            <span className="text-xs font-mono text-zinc-700 italic">
                                Right-click a task → Set as Next Move
                            </span>
                        </div>
                    )
                )}

                {/* Add task — lives right under Next Move */}
                <div className="flex items-center gap-2.5 mt-4 group/add">
                    <Plus size={11} className="text-zinc-700 group-focus-within/add:text-zinc-500 shrink-0 transition-colors" />
                    <input
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                        className="flex-1 bg-transparent outline-none text-sm text-zinc-600 placeholder:text-zinc-700 hover:text-zinc-300 focus:text-white transition-colors font-mono"
                        placeholder="Add task..."
                    />
                </div>
            </div>

            {/* ── Task groups ── */}
            <div className="px-4 py-3 space-y-0.5">

                {/* Today */}
                <Group
                    label="Today" count={today.length}
                    isOpen={expandedGroups.today}
                    onToggle={() => toggleGroup('today')}
                    labelClass="text-zinc-500"
                >
                    {today.map(t => (
                        <TaskRow key={t.id} task={t}
                            onToggle={() => toggleTask(t.id)}
                            onContextMenu={e => openContextMenu(e, t.id)}
                        />
                    ))}
                </Group>

                {/* Soon */}
                <Group
                    label="Soon" count={soon.length}
                    isOpen={expandedGroups.soon}
                    onToggle={() => toggleGroup('soon')}
                    labelClass="text-zinc-600"
                >
                    {soon.map(t => (
                        <TaskRow key={t.id} task={t}
                            onToggle={() => toggleTask(t.id)}
                            onContextMenu={e => openContextMenu(e, t.id)}
                        />
                    ))}
                </Group>

                {/* Future */}
                <Group
                    label="Future" count={future.length}
                    isOpen={expandedGroups.future}
                    onToggle={() => toggleGroup('future')}
                    labelClass="text-zinc-700"
                >
                    {future.map(t => (
                        <TaskRow key={t.id} task={t}
                            onToggle={() => toggleTask(t.id)}
                            onContextMenu={e => openContextMenu(e, t.id)}
                        />
                    ))}
                </Group>

                {/* Blocked — only when present */}
                {blocked.length > 0 && (
                    <Group
                        label="Blocked" count={blocked.length}
                        isOpen={expandedGroups.blocked}
                        onToggle={() => toggleGroup('blocked')}
                        labelClass="text-red-400/60"
                    >
                        {blocked.map(t => (
                            <TaskRow key={t.id} task={t} variant="blocked"
                                onToggle={() => toggleTask(t.id)}
                                onContextMenu={e => openContextMenu(e, t.id)}
                            />
                        ))}
                    </Group>
                )}

                {/* Done */}
                <Group
                    label="Done" count={completed.length}
                    isOpen={expandedGroups.done}
                    onToggle={() => toggleGroup('done')}
                    labelClass="text-zinc-700"
                >
                    {completed.map(t => (
                        <TaskRow key={t.id} task={t} variant="done"
                            onToggle={() => toggleTask(t.id)}
                            onContextMenu={e => openContextMenu(e, t.id)}
                        />
                    ))}
                </Group>

            </div>

            {/* ── Context menu — portalled to body ── */}
            {contextMenu && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={closeMenu}
                        onContextMenu={e => { e.preventDefault(); closeMenu(); }}
                    />
                    <div
                        className="fixed z-[9999] w-48 bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        {(() => {
                            const task = projectTasks.find(t => t.id === contextMenu.taskId);
                            if (!task) return null;
                            const sched = task.schedule || 'today';
                            return (
                                <>
                                    {!task.done && !task.isNextAction && (
                                        <MenuItem onClick={() => handleContextAction('next', task.id)} icon={<Target size={11} />}>
                                            Set as Next Move
                                        </MenuItem>
                                    )}
                                    {task.isNextAction && (
                                        <MenuItem onClick={() => handleContextAction('unnext', task.id)} icon={<X size={11} />}>
                                            Remove Next Move
                                        </MenuItem>
                                    )}

                                    {!task.done && (
                                        <>
                                            <div className="h-px bg-white/[0.06] my-1" />
                                            {sched !== 'today' && (
                                                <MenuItem onClick={() => handleContextAction('sched-today', task.id)} icon={<Calendar size={11} />}>
                                                    Move to Today
                                                </MenuItem>
                                            )}
                                            {sched !== 'soon' && (
                                                <MenuItem onClick={() => handleContextAction('sched-soon', task.id)} icon={<Clock size={11} />}>
                                                    Move to Soon
                                                </MenuItem>
                                            )}
                                            {sched !== 'future' && (
                                                <MenuItem onClick={() => handleContextAction('sched-future', task.id)} icon={<Layers size={11} />}>
                                                    Move to Future
                                                </MenuItem>
                                            )}
                                        </>
                                    )}

                                    {!task.done && (
                                        <>
                                            <div className="h-px bg-white/[0.06] my-1" />
                                            {task.status !== 'blocked'
                                                ? <MenuItem onClick={() => handleContextAction('block', task.id)} icon={<Ban size={11} />}>Mark Blocked</MenuItem>
                                                : <MenuItem onClick={() => handleContextAction('unblock', task.id)} icon={<Circle size={11} />}>Unblock</MenuItem>
                                            }
                                        </>
                                    )}

                                    <div className="h-px bg-white/[0.06] my-1" />
                                    <MenuItem
                                        onClick={() => handleContextAction('delete', task.id)}
                                        className="text-red-400 hover:bg-red-500/10"
                                        icon={<X size={11} />}
                                    >
                                        Delete
                                    </MenuItem>
                                </>
                            );
                        })()}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}

/* ── Menu item ── */
function MenuItem({ onClick, icon, children, className = "text-zinc-300 hover:bg-white/[0.08] hover:text-white" }) {
    return (
        <button
            onClick={onClick}
            className={cn("w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center gap-2.5 transition-colors", className)}
        >
            <span className="opacity-60">{icon}</span>
            {children}
        </button>
    );
}

/* ── Collapsible section ── */
function Group({ label, count, isOpen, onToggle, labelClass = "text-zinc-600", children }) {
    return (
        <div>
            <button
                onClick={onToggle}
                className="flex items-center gap-1.5 w-full py-1.5 px-2 text-left hover:bg-white/[0.03] rounded-lg transition-colors group/grp"
            >
                {isOpen
                    ? <ChevronDown size={11} className="text-zinc-700 group-hover/grp:text-zinc-500 transition-colors" />
                    : <ChevronRight size={11} className="text-zinc-700 group-hover/grp:text-zinc-500 transition-colors" />
                }
                <span className={cn("text-fluid-3xs uppercase tracking-[0.15em] font-bold font-mono", labelClass)}>
                    {label}
                </span>
                {count > 0 && (
                    <span className="text-fluid-3xs text-zinc-700 font-mono ml-0.5">{count}</span>
                )}
            </button>

            {isOpen && React.Children.count(children) > 0 && (
                <div className="mt-0.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    {children}
                </div>
            )}
        </div>
    );
}

/* ── Task row ── */
function TaskRow({ task, onToggle, onContextMenu, variant }) {
    const isDone    = variant === 'done';
    const isBlocked = variant === 'blocked';

    return (
        <div
            className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors cursor-default select-none"
            onContextMenu={onContextMenu}
        >
            <button
                onClick={onToggle}
                className={cn(
                    "w-4 h-4 rounded-full border transition-all shrink-0 flex items-center justify-center",
                    isDone    ? "border-zinc-700 bg-zinc-800"
                    : isBlocked ? "border-red-400/30"
                    : "border-zinc-700 group-hover:border-zinc-500"
                )}
            >
                {isDone    && <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />}
                {isBlocked && <Ban size={8} className="text-red-400/50" />}
            </button>

            <span className={cn(
                "flex-1 min-w-0 text-sm truncate font-mono transition-colors",
                isDone    ? "text-zinc-700 line-through"
                : isBlocked ? "text-zinc-500"
                : "text-zinc-400 group-hover:text-zinc-200"
            )}>
                {task.title}
            </span>

            {task.due && !isDone && (
                <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                    {new Date(task.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
            )}
        </div>
    );
}

import React, { useCallback } from "react";
import { Widget } from "./composed/Widget.jsx";
import { EmptyState } from "./composed/EmptyState.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover.jsx";
import { ChevronRight } from "./ui/CustomIcon.jsx";
import { StickyNote } from "lucide-react";

/**
 * QuickCaptureWidget — journal capture plus today's entries.
 *
 * The entries popup used to be a createPortal with hand-measured
 * getBoundingClientRect positioning and a fixed translateY(-100%) — no flip
 * logic, so it broke the moment the widget wasn't at the bottom of the page.
 * Base UI's Popover handles placement and collisions, which matters now that
 * the widget can be dragged anywhere in the grid.
 */
export default function QuickCaptureWidget({
    captureContent,
    setCaptureContent,
    onCapture,
    todayEntries = [],
    onOpenNote,
    ...shell
}) {
    const handleCapture = useCallback(() => onCapture?.(), [onCapture]);

    return (
        <Widget
            title="Quick Capture"
            trailing={
                todayEntries.length > 0 ? (
                    <span className="text-xs text-muted-foreground">{todayEntries.length} today</span>
                ) : null
            }
            footer={
                <>
                    <Popover>
                        <PopoverTrigger
                            render={
                                <button className="text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
                                    Entries
                                </button>
                            }
                        />
                        <PopoverContent side="top" align="start" className="w-64 p-4">
                            {todayEntries.length === 0 ? (
                                <EmptyState
                                    icon={StickyNote}
                                    title="No entries yet today"
                                    size="inline"
                                />
                            ) : (
                                <div className="max-h-48 space-y-2.5 overflow-y-auto custom-scrollbar">
                                    {todayEntries.map((entry) => (
                                        <button
                                            key={entry.id}
                                            onClick={() => onOpenNote?.(entry.id)}
                                            className="w-full border-l border-border pl-3 text-left transition-colors hover:border-border-strong"
                                        >
                                            <div className="text-xs uppercase tracking-wider text-muted-foreground">
                                                {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                            <div className="line-clamp-1 text-xs leading-snug text-muted-foreground transition-colors hover:text-foreground">
                                                {entry.title}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>

                    <button
                        onClick={handleCapture}
                        disabled={!captureContent?.trim()}
                        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-20"
                    >
                        <span>Capture</span>
                        <ChevronRight size={14} className="shrink-0" />
                    </button>
                </>
            }
            {...shell}
        >
            <textarea
                value={captureContent}
                onChange={(e) => setCaptureContent(e.target.value)}
                placeholder="What's on your mind…"
                className="h-full min-h-16 w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-hidden placeholder:text-muted-foreground/50"
            />
        </Widget>
    );
}

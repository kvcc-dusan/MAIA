import React, { useCallback } from "react";
import { Widget } from "./composed/Widget.jsx";
import { EmptyState } from "./composed/EmptyState.jsx";
import { Popover, PopoverContent, PopoverTrigger } from "./arc/popover/popover.jsx";
import { Button } from "./arc/button/button.jsx";
import { Textarea } from "./arc/textarea/textarea.jsx";
import { ChevronRight, StickyNote } from "lucide-react";
import styles from "./QuickCaptureWidget.module.css";

/**
 * QuickCaptureWidget — journal capture plus today's entries.
 *
 * The entries popup used to be a createPortal with hand-measured
 * getBoundingClientRect positioning and a fixed translateY(-100%) — no flip
 * logic, so it broke the moment the widget wasn't at the bottom of the page.
 * Arc's Popover (Radix) handles placement and collisions, which matters now
 * that the widget can be dragged anywhere in the grid.
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
                    <span className={styles.count}>{todayEntries.length} today</span>
                ) : null
            }
            footer={
                <>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm">Entries</Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="w-64">
                            {todayEntries.length === 0 ? (
                                <EmptyState
                                    icon={StickyNote}
                                    title="No entries yet today"
                                    description="Capture a thought and it lands here."
                                    size="inline"
                                />
                            ) : (
                                <div className={`${styles.entries} custom-scrollbar`}>
                                    {todayEntries.map((entry) => (
                                        <button
                                            key={entry.id}
                                            type="button"
                                            onClick={() => onOpenNote?.(entry.id)}
                                            className={styles.entry}
                                        >
                                            <span className={styles.entryTime}>
                                                {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                            <span className={styles.entryTitle}>{entry.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCapture}
                        disabled={!captureContent?.trim()}
                    >
                        Capture
                        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
                    </Button>
                </>
            }
            {...shell}
        >
            <div className={styles.capture}>
                <Textarea
                    label="What's on your mind"
                    value={captureContent}
                    onChange={(e) => setCaptureContent(e.target.value)}
                    className={styles.area}
                />
            </div>
        </Widget>
    );
}

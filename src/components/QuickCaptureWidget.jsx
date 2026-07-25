import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card.jsx";
import { GlassErrorBoundary } from "./GlassErrorBoundary.jsx";
import { ChevronRight } from "./ui/CustomIcon.jsx";

/**
 * QuickCaptureWidget — Journal capture + today's entries pop-up.
 * Uses a React Portal so the entries popup escapes all overflow-hidden containers.
 */
export default function QuickCaptureWidget({
    captureContent,
    setCaptureContent,
    onCapture,
    todayEntries = [],
    onOpenNote,
}) {
    const [showEntries, setShowEntries] = useState(false);
    const popoverRef = useRef(null);
    const btnRef = useRef(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

    // Position the portal-based popup relative to the Entries button
    useEffect(() => {
        if (!showEntries || !btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        setPopoverPos({
            top: rect.top - 8, // 8px gap above button
            left: rect.left,
        });
    }, [showEntries]);

    // Close entries pop-up on click outside
    useEffect(() => {
        if (!showEntries) return;
        const handle = (e) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)
            ) {
                setShowEntries(false);
            }
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [showEntries]);

    const handleCapture = useCallback(() => {
        onCapture?.();
    }, [onCapture]);

    return (
        <GlassErrorBoundary>
            <Card className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/40 shadow-lg backdrop-blur-xl">

                {/* HEADER */}
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-0">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Quick Capture
                    </CardTitle>
                    {todayEntries.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {todayEntries.length} today
                        </span>
                    )}
                </CardHeader>

                {/* BODY: Text input */}
                <CardContent className="flex-1 px-5 pt-3 pb-5">
                    <textarea
                        value={captureContent}
                        onChange={(e) => setCaptureContent(e.target.value)}
                        placeholder="What's on your mind…"
                        rows={2}
                        className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-hidden leading-relaxed"
                    />
                </CardContent>

                {/* FOOTER: Entries + Capture */}
                <CardFooter className="relative z-20 flex items-center justify-between border-t border-border-subtle bg-muted/20 px-5 py-3">
                    {/* View Entries — text only, no icon */}
                    <button
                        ref={btnRef}
                        onClick={() => setShowEntries((v) => !v)}
                        className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Entries
                    </button>

                    {/* Capture — text style with arrow icon */}
                    <button
                        onClick={handleCapture}
                        disabled={!captureContent?.trim()}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        <span>Capture</span>
                        <ChevronRight size={14} className="shrink-0" />
                    </button>
                </CardFooter>

            </Card>

            {/* Entries popup — rendered via Portal to escape all overflow-hidden ancestors */}
            {showEntries && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed w-64 max-h-48 overflow-y-auto custom-scrollbar rounded-2xl border border-border bg-black/95 backdrop-blur-xl shadow-2xl p-4 z-9999"
                    style={{
                        top: popoverPos.top,
                        left: popoverPos.left,
                        transform: "translateY(-100%)",
                    }}
                >
                    {todayEntries.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic text-center py-2">
                            No entries yet today.
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {todayEntries.map((entry) => (
                                <button
                                    key={entry.id}
                                    onClick={() => {
                                        onOpenNote?.(entry.id);
                                        setShowEntries(false);
                                    }}
                                    className="w-full text-left pl-3 border-l border-border hover:border-border-strong transition-colors"
                                >
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                        {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                    <div className="text-xs text-muted-foreground leading-snug line-clamp-1 hover:text-foreground transition-colors">
                                        {entry.title}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>,
                document.body
            )}
        </GlassErrorBoundary>
    );
}

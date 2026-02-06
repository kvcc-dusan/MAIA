import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card.jsx";
import { GlassErrorBoundary } from "./GlassErrorBoundary.jsx";
import FocusTaskItem from "./FocusTaskItem.jsx";

export default function FocusWidget({ todayTasks, onOpenPulse }) {
  return (
    <GlassErrorBoundary>
      <Card className="flex min-h-[260px] w-full flex-col rounded-[24px] border-[0.5px] border-white/10 bg-card/80 shadow-lg backdrop-blur-sm">

        {/* HEADER: Focus Title */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today's Focus</CardTitle>
        </CardHeader>

        {/* BODY: Focus List */}
        <div className="flex flex-1 flex-col">
          {/* Focus Items */}
          <CardContent className="flex flex-col gap-4 p-5 pb-4 pt-1">
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-2 text-center font-mono text-[10px] italic uppercase tracking-widest text-muted-foreground">
                no tasks for today.
              </div>
            ) : (
              <ul className="max-h-[80px] space-y-2 overflow-y-auto custom-scrollbar">
                {todayTasks.slice(0, 3).map(task => (
                  <FocusTaskItem key={task.id} task={task} />
                ))}
                {todayTasks.length > 3 && (
                  <li className="pt-1 text-[10px] text-muted-foreground">+{todayTasks.length - 3} more</li>
                )}
              </ul>
            )}
          </CardContent>
        </div>

        {/* FOOTER: Open Chronos */}
        <CardFooter className="relative z-20 flex items-center justify-end border-t-[0.5px] border-white/5 bg-muted/20 p-4 py-3">
          <button
            onClick={onOpenPulse}
            aria-label="Open Chronos Dashboard"
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Open Chronos</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </button>
        </CardFooter>

      </Card>
    </GlassErrorBoundary>
  );
}

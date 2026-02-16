import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card.jsx";
import { GlassErrorBoundary } from "./GlassErrorBoundary.jsx";
import FocusTaskItem from "./FocusTaskItem.jsx";

/**
 * FocusWidget — Today's Focus with tasks, sessions,
 * and an always-visible expandable momentum drawer.
 */
export default function FocusWidget({
  todayTasks = [],
  sessions = [],
  signals = { velocity: [], staleness: [] },
  onOpenPulse,
  onTaskClick,
}) {
  const [momentumOpen, setMomentumOpen] = useState(false);

  // Today's sessions
  const todayStr = new Date().toDateString();
  const todaySessions = useMemo(() => {
    return sessions
      .filter((s) => new Date(s.start).toDateString() === todayStr)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [sessions, todayStr]);

  return (
    <GlassErrorBoundary>
      <Card className="flex w-full flex-col overflow-hidden rounded-[24px] border-[0.5px] border-white/10 bg-card/80 shadow-lg backdrop-blur-sm">

        {/* HEADER */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-0">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Today's Focus
          </CardTitle>
        </CardHeader>

        {/* BODY */}
        <CardContent className="flex flex-col gap-0 px-5 pt-3 pb-5">

          {/* ── TASKS ── */}
          {todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center font-mono text-[10px] italic uppercase tracking-widest text-muted-foreground">
              No focus tasks.
            </div>
          ) : (
            <ul className="space-y-1 py-1">
              {todayTasks.slice(0, 4).map((task) => (
                <FocusTaskItem key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
              ))}
              {todayTasks.length > 4 && (
                <li className="pt-1 text-[10px] text-muted-foreground font-mono">
                  +{todayTasks.length - 4} more
                </li>
              )}
            </ul>
          )}

          {/* ── SESSIONS ── */}
          {todaySessions.length > 0 && (
            <div className="border-t border-white/5 pt-3 mt-3">
              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Sessions</div>
              <div className="space-y-1.5">
                {todaySessions.slice(0, 2).map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-mono truncate max-w-[60%]">{s.title}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(s.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {" – "}
                      {new Date(s.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
                {todaySessions.length > 2 && (
                  <div className="text-[10px] text-muted-foreground font-mono">+{todaySessions.length - 2} more</div>
                )}
              </div>
            </div>
          )}

          {/* ── MOMENTUM (expandable, always present) ── */}
          <div
            className="overflow-hidden transition-all duration-300 ease-out"
            style={{ maxHeight: momentumOpen ? "300px" : "0px", opacity: momentumOpen ? 1 : 0 }}
          >
            <div className="border-t border-white/5 pt-3 mt-3">
              {signals.velocity.length > 0 ? (
                <div className="mb-3">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Momentum</div>
                  <div className="space-y-1.5">
                    {signals.velocity.map((v) => (
                      <div key={v.tag} className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400 font-mono">#{v.tag}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${v.velocity > 0 ? "bg-emerald-500/10 text-emerald-400" :
                          v.velocity < 0 ? "bg-red-500/10 text-red-400" :
                            "bg-zinc-800/50 text-zinc-600"
                          }`}>
                          {v.velocity > 0 ? "+" : ""}{v.velocity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-muted-foreground italic text-center py-2">
                  No momentum data yet.
                </div>
              )}
              {signals.staleness.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">At Risk</div>
                  <div className="space-y-1.5">
                    {signals.staleness.map((s) => (
                      <div key={s.project.id} className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400 font-mono truncate">{s.project.name}</span>
                        <span className="text-red-400/70 text-[10px] font-mono">{s.lastActivityDays}d idle</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </CardContent>

        {/* FOOTER — always visible */}
        <CardFooter className="relative z-20 flex items-center justify-end border-t-[0.5px] border-white/5 bg-muted/20 px-5 py-3">
          <button
            onClick={() => setMomentumOpen((v) => !v)}
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Momentum
          </button>
        </CardFooter>

      </Card>
    </GlassErrorBoundary>
  );
}

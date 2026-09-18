import React, { useState, useMemo } from "react";
import { Widget } from "./composed/Widget.jsx";
import { EmptyState } from "./composed/EmptyState.jsx";
import FocusTaskItem from "./FocusTaskItem.jsx";
import { Crosshair } from "lucide-react";

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
  ...shell
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
    <Widget
      title="Today's Focus"
      footer={
        <>
          <span className="text-xs tracking-wide text-muted-foreground">
            {todaySessions.length > 0 && `${todaySessions.length} session${todaySessions.length === 1 ? "" : "s"}`}
          </span>
          <button
            onClick={() => setMomentumOpen((v) => !v)}
            aria-expanded={momentumOpen}
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Momentum
          </button>
        </>
      }
      {...shell}
    >
      <div className="flex h-full flex-col">

          {/* ── TASKS ── */}
          {todayTasks.length === 0 ? (
            <EmptyState
              icon={Crosshair}
              title="No focus tasks"
              description="Today's next actions land here as you set them in Opus."
              className="flex-1"
            />
          ) : (
            <ul className="space-y-1 py-1">
              {todayTasks.slice(0, 4).map((task) => (
                <FocusTaskItem key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
              ))}
              {todayTasks.length > 4 && (
                <li className="pt-1 text-xs text-muted-foreground">
                  +{todayTasks.length - 4} more
                </li>
              )}
            </ul>
          )}

          {/* ── SESSIONS ── */}
          {todaySessions.length > 0 && (
            <div className="border-t border-border-subtle pt-3 mt-3">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Sessions</div>
              <div className="space-y-1.5">
                {todaySessions.slice(0, 2).map((s) => (
                  // Clicking a session opens Chronos — the prop was plumbed
                  // from the page but never consumed.
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpenPulse?.()}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-xs text-muted-foreground truncate max-w-[60%]">{s.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {" – "}
                      {new Date(s.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </button>
                ))}
                {todaySessions.length > 2 && (
                  <div className="text-xs text-muted-foreground">+{todaySessions.length - 2} more</div>
                )}
              </div>
            </div>
          )}

          {/* ── MOMENTUM (expandable, always present) ── */}
          {/* grid-rows 0fr -> 1fr animates to the content's real height, so the
              drawer no longer clips at a hardcoded 300px. */}
          <div
            className="grid transition-all duration-300 ease-out"
            style={{ gridTemplateRows: momentumOpen ? "1fr" : "0fr", opacity: momentumOpen ? 1 : 0 }}
          >
            <div className="overflow-hidden border-t border-border-subtle pt-3 mt-3">
              {signals.velocity.length > 0 ? (
                <div className="mb-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Momentum</div>
                  <div className="space-y-1.5">
                    {signals.velocity.map((v) => (
                      <div key={v.tag} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">#{v.tag}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${v.velocity > 0 ? "bg-success/10 text-success" :
                          v.velocity < 0 ? "bg-destructive/10 text-destructive" :
                            "bg-secondary/50 text-subtle-foreground"
                          }`}>
                          {v.velocity > 0 ? "+" : ""}{v.velocity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic text-center py-2">
                  No momentum data yet.
                </div>
              )}
              {signals.staleness.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">At Risk</div>
                  <div className="space-y-1.5">
                    {signals.staleness.map((s) => (
                      <div key={s.project.id} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate">{s.project.name}</span>
                        <span className="text-destructive/70 text-xs">{s.lastActivityDays}d idle</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

      </div>
    </Widget>
  );
}

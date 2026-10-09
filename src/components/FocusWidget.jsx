import React, { useId, useState, useMemo } from "react";
import { Widget } from "./composed/Widget.jsx";
import { EmptyState } from "./composed/EmptyState.jsx";
import FocusTaskItem from "./FocusTaskItem.jsx";
import { Button } from "./arc/button/button.jsx";
import { Badge } from "./arc/badge/badge.jsx";
import { cn } from "@/lib/utils";
import { Crosshair } from "lucide-react";
import styles from "./FocusWidget.module.css";

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
  const drawerId = useId();

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
          <span className={styles.footerCount}>
            {todaySessions.length > 0 && `${todaySessions.length} session${todaySessions.length === 1 ? "" : "s"}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMomentumOpen((v) => !v)}
            aria-expanded={momentumOpen}
            aria-controls={drawerId}
          >
            Momentum
          </Button>
        </>
      }
      {...shell}
    >
      <div className={styles.root}>
        {/* Tasks */}
        {todayTasks.length === 0 ? (
          <EmptyState
            icon={Crosshair}
            title="No focus tasks"
            description="Today's next actions land here as you set them in Opus."
            className="flex-1"
          />
        ) : (
          <ul className={styles.taskList}>
            {todayTasks.slice(0, 4).map((task) => (
              <FocusTaskItem key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
            ))}
            {todayTasks.length > 4 && (
              <li className={styles.more}>+{todayTasks.length - 4} more</li>
            )}
          </ul>
        )}

        {/* Sessions */}
        {todaySessions.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionLabel}>Sessions</h3>
            <div className={styles.rows}>
              {todaySessions.slice(0, 2).map((s) => (
                // Clicking a session opens Chronos.
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onOpenPulse?.()}
                  className={styles.row}
                >
                  <span className={styles.rowName}>{s.title}</span>
                  <span className={styles.rowValue}>
                    {new Date(s.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    {" to "}
                    {new Date(s.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </button>
              ))}
              {todaySessions.length > 2 && (
                <p className={styles.more}>+{todaySessions.length - 2} more</p>
              )}
            </div>
          </div>
        )}

        {/* Momentum drawer: always mounted so the open state animates; inert
            while closed so its contents leave the tab order. */}
        <div id={drawerId} className={cn(styles.drawer, momentumOpen && styles.drawerOpen)} inert={!momentumOpen}>
          <div className={styles.drawerInner}>
            <div className={styles.section}>
              {signals.velocity.length > 0 ? (
                <div className={styles.block}>
                  <h3 className={styles.sectionLabel}>Momentum</h3>
                  <div className={styles.rows}>
                    {signals.velocity.map((v) => (
                      <div key={v.tag} className={styles.row}>
                        <span className={styles.rowName}>#{v.tag}</span>
                        <Badge tone={v.velocity > 0 ? "success" : v.velocity < 0 ? "danger" : "neutral"}>
                          {v.velocity > 0 ? "+" : ""}{v.velocity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className={styles.empty}>No momentum data yet.</p>
              )}
              {signals.staleness.length > 0 && (
                <div className={styles.block}>
                  <h3 className={styles.sectionLabel}>At risk</h3>
                  <div className={styles.rows}>
                    {signals.staleness.map((s) => (
                      <div key={s.project.id} className={styles.row}>
                        <span className={styles.rowName}>{s.project.name}</span>
                        <span className={cn(styles.rowValue, styles.atRisk)}>{s.lastActivityDays}d idle</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Widget>
  );
}

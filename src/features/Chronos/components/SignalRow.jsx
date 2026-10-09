import React, { useState } from "react";
import { X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/arc/popover/popover";
import { Menu, ContextDangerItem } from "@/components/composed/Menu";
import { IconButton } from "@/components/composed/IconButton";
import { getPriorityColor } from "@/lib/utils";
import { SIGNAL_PRIORITIES } from "@/lib/constants";
import { formatTime } from "@/lib/time";
import styles from "./Row.module.css";

export default React.memo(SignalRow);

// SIGNAL_PRIORITIES only ever contained p1/p2/p3. The 'low' fallback here
// (and the matching default in ChronosModal's signalDraft) never matched an
// entry, so a freshly-created signal's priority silently failed to resolve.
function SignalRow({ signal, onDelete, onEdit }) {
  const [open, setOpen] = useState(false);
  const priority = signal.priority || "p3";
  const dotColor = getPriorityColor(priority);
  const priorityLabel = SIGNAL_PRIORITIES.find((p) => p.value === priority)?.label || "Normal priority";

  return (
    <Menu.Context>
      <Menu.ContextTrigger className="contents">
        <div className={styles.row}>
          <span className={styles.dot} aria-hidden="true">
            <span className={styles.dotMark} style={{ backgroundColor: dotColor }} />
          </span>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={styles.main}>
                <span className={styles.title}>{signal.title}</span>
                <span className={styles.meta}>{formatTime(signal.scheduledAt)}</span>
                <span className={styles.srOnly}>{priorityLabel}</span>
              </button>
            </PopoverTrigger>

            <PopoverContent align="start" className={styles.detail}>
              <div className={styles.detailBody}>
                <h4 className={styles.detailTitle}>{signal.title}</h4>
                {signal.description && <p className={styles.detailText}>{signal.description}</p>}
                <div className={styles.detailFoot}>
                  <span className={styles.priority}>
                    <span className={styles.priorityDot} style={{ backgroundColor: dotColor }} aria-hidden="true" />
                    {priorityLabel}
                  </span>
                  <span>{formatTime(signal.scheduledAt)}</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <IconButton icon={X} label="Cancel signal" className={styles.remove} onClick={onDelete} />
        </div>
      </Menu.ContextTrigger>

      <Menu.ContextContent>
        <Menu.ContextItem onClick={onEdit}>Edit signal</Menu.ContextItem>
        <Menu.ContextSeparator />
        <ContextDangerItem onClick={onDelete}>Cancel signal</ContextDangerItem>
      </Menu.ContextContent>
    </Menu.Context>
  );
}

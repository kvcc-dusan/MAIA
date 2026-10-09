import { cn } from "@/lib/utils";
import styles from "./StatusDotLabel.module.css";

/**
 * A small bordered pill with an optional status dot and a text label.
 * Status is always carried by the label; the dot only reinforces it.
 */
export function StatusDotLabel({ dot, className, children }) {
  return (
    <span className={cn(styles.pill, className)}>
      {dot && <span className={styles.dot} style={{ backgroundColor: dot }} aria-hidden="true" />}
      {children}
    </span>
  );
}

import { Tooltip } from "@/components/arc/tooltip/tooltip";
import styles from "./MaiaShell.module.css";

/**
 * One icon on the left rail. Icon-only, so the label is the accessible name and
 * the tooltip; `active` marks the page the user is on.
 */
export const RailButton = ({ icon: Icon, label, hint, active, onClick, shortcut }) => (
  <Tooltip content={hint ?? label} side="right">
    <button
      type="button"
      className={styles.railButton}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      aria-keyshortcuts={shortcut}
      data-active={active || undefined}
      onClick={onClick}
    >
      {Icon ? <Icon size={20} strokeWidth={1.75} aria-hidden="true" /> : null}
    </button>
  </Tooltip>
);

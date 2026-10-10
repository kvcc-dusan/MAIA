import React from "react";
import styles from "./PageBar.module.css";

/**
 * The toolbar row every hub page opens with: filters and search on the left
 * (`children`), the page's one primary action on the right (`action`).
 */
export default function PageBar({ children, action }) {
  return (
    <div className={styles.bar}>
      <div className={styles.filters}>{children}</div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

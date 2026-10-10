import React from "react";
import styles from "./ListRow.module.css";

/**
 * A list row: optional `leading` (a checkbox), title with subtitle, `trailing`
 * (badges, owner, date). With `onClick` the title block becomes one focusable
 * button; leading and trailing stay outside it so they may hold controls.
 */
export default function ListRow({ title, subtitle, leading, trailing, onClick, "aria-label": ariaLabel }) {
  const main = (
    <>
      <span className={styles.title}>{title}</span>
      {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
    </>
  );
  return (
    <div className={styles.row} data-interactive={onClick ? "" : undefined}>
      {leading ? <div className={styles.leading}>{leading}</div> : null}
      {onClick ? (
        <button type="button" className={styles.main} onClick={onClick} aria-label={ariaLabel}>{main}</button>
      ) : (
        <div className={styles.main}>{main}</div>
      )}
      {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
    </div>
  );
}

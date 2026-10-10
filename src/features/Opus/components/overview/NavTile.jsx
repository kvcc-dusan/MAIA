import React from "react";
import styles from "./NavTile.module.css";

/**
 * Makes a non-interactive block (an Arc metric card, a gauge) navigate without
 * nesting it in a button: the block renders as is and a transparent button is
 * stretched over it. `label` is the button's accessible name.
 */
export default function NavTile({ label, onNavigate, className, children }) {
  return (
    <div className={[styles.tile, className].filter(Boolean).join(" ")}>
      {children}
      <button type="button" className={styles.hit} aria-label={label} onClick={onNavigate} />
    </div>
  );
}

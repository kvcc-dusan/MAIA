import React from "react";
import { initials } from "./format";
import styles from "./OwnerAvatar.module.css";

/** Initials in a small circle, with the name beside it when `showName` is set. Nothing without an owner. */
export default function OwnerAvatar({ name, showName = false }) {
  if (!name) return null;
  return (
    <span className={styles.root} title={showName ? undefined : name}>
      <span className={styles.circle} role={showName ? undefined : "img"} aria-label={showName ? undefined : name} aria-hidden={showName ? "true" : undefined}>
        {initials(name)}
      </span>
      {showName ? <span className={styles.name}>{name}</span> : null}
    </span>
  );
}

import React from "react";
import styles from "./SizeMark.module.css";

const SIZES = { S: "Small", M: "Medium", L: "Large" };

/** The S/M/L estimate in a small circle. */
export default function SizeMark({ size }) {
  if (!SIZES[size]) return null;
  return <span className={styles.root} role="img" aria-label={`Size ${SIZES[size].toLowerCase()}`}>{size}</span>;
}

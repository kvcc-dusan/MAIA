import React from "react";
import { dueState, humanDate } from "./format";
import styles from "./DueLabel.module.css";

const TONE_CLASS = { overdue: styles.overdue, soon: styles.soon };

/** "Overdue 8 Oct" in danger, due within 3 days in warning, otherwise a quiet date. `done` mutes it. */
export default function DueLabel({ due, today, done = false }) {
  const text = humanDate(due);
  if (!text) return null;
  const { tone } = dueState(due, today);
  const effective = done ? "later" : tone;
  return (
    <span className={`${styles.root} ${TONE_CLASS[effective] ?? ""}`}>
      {effective === "overdue" ? `Overdue ${text}` : text}
    </span>
  );
}

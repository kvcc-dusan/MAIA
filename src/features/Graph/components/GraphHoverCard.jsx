import React from "react";
import { Badge } from "@/components/arc/badge/badge";
import styles from "./GraphHoverCard.module.css";

export default function GraphHoverCard({ node }) {
  if (!node) return null;
  const tags = node.tags || [];
  return (
    <div className={styles.card} role="status">
      <p className={styles.title}>{node.title}</p>
      <div className={styles.tags}>
        {tags.length > 0
          ? tags.map((t) => <Badge key={t} tone="neutral">#{t}</Badge>)
          : <span className={styles.none}>No tags</span>}
      </div>
      <p className={styles.hint}>Click to open</p>
    </div>
  );
}

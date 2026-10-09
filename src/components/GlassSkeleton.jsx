import React from "react";
import { Skeleton } from "./arc/skeleton/skeleton.jsx";
import styles from "./GlassSkeleton.module.css";

// Name kept for the App.jsx Suspense fallback; the styling is plain Arc now.
const GlassSkeleton = () => (
  <div className={styles.root}>
    <Skeleton label="Loading page" lines={6} />
  </div>
);

export default GlassSkeleton;

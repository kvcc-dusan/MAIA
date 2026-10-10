import React, { useMemo } from "react";
import { makeMarkdown } from "@/lib/markdown";
import styles from "./MarkdownView.module.css";

// One renderer for the whole app; its output is already run through DOMPurify.
const renderer = makeMarkdown();

/** Read-only markdown. Never receives HTML from outside the sanitizing renderer. */
export default function MarkdownView({ source, label }) {
  const html = useMemo(() => renderer.render(source ?? ""), [source]);
  return <div className={styles.prose} role="document" aria-label={label} dangerouslySetInnerHTML={{ __html: html }} />;
}

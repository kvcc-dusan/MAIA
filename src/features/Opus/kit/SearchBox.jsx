import React from "react";
import { SearchField } from "@/components/arc/search-field/search-field";
import styles from "./SearchBox.module.css";

/** Toolbar search. The Arc label stays for screen readers and is hidden visually. */
export default function SearchBox({ value, onValueChange, label = "Search", placeholder = "Search", className }) {
  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <SearchField label={label} value={value} onValueChange={onValueChange} placeholder={placeholder} />
    </div>
  );
}

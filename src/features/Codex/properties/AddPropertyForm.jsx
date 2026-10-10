import React, { useState } from "react";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { Select } from "@/components/composed/Select";
import { forcedTypeFor, TYPE_OPTIONS } from "./propertyTypes.js";
import styles from "./Properties.module.css";

/** Name and type for a new property. `onAdd(name, type)` returns an error message, or nothing when it worked. */
export default function AddPropertyForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [error, setError] = useState(null);
  const forced = forcedTypeFor(name);
  const isTypeLocked = forced !== null;

  const submit = () => {
    const message = onAdd(name.trim(), forced ?? type);
    if (message) setError(message);
  };

  return (
    <div
      className={styles.form}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <Input
        label="Property name"
        value={name}
        error={error ?? undefined}
        autoFocus
        onChange={(event) => {
          setName(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          submit();
        }}
      />
      <Select
        label="Type"
        value={forced ?? type}
        options={isTypeLocked ? [{ value: forced, label: forced === "text" ? "Text" : "List" }] : TYPE_OPTIONS}
        onChange={(next) => next && setType(next)}
      />
      <div className={styles.formActions}>
        <Button variant="primary" size="md" onClick={submit}>Add property</Button>
        <Button variant="ghost" size="md" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

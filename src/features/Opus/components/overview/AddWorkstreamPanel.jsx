import React, { useId, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { SidePanel } from "@/components/composed/SidePanel";
import { WORKSTREAM_COLORS } from "../../lib/projectModel";
import styles from "./Panels.module.css";

const FORM_ID = "overview-add-workstream";
const KEY_STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Four series colours as a radiogroup: one Tab stop, arrows move and select. */
function ColorPicker({ value, onChange }) {
  const labelId = useId();
  const refs = useRef([]);
  const checked = Math.max(WORKSTREAM_COLORS.indexOf(value), 0);

  const onKeyDown = (event) => {
    const step = KEY_STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (checked + step + WORKSTREAM_COLORS.length) % WORKSTREAM_COLORS.length;
    onChange(WORKSTREAM_COLORS[next]);
    refs.current[next]?.focus();
  };

  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.legend}>Colour</span>
      <div role="radiogroup" aria-labelledby={labelId} className={styles.swatches} onKeyDown={onKeyDown}>
        {WORKSTREAM_COLORS.map((color, index) => (
          <button
            key={color}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="radio"
            aria-checked={index === checked}
            aria-label={`Colour ${color}`}
            tabIndex={index === checked ? 0 : -1}
            className={styles.swatch}
            onClick={() => onChange(color)}
          >
            <span className={styles.chip} style={{ background: `var(--series-${color})` }} aria-hidden="true" />
            <span>{color}</span>
            {index === checked ? <Check size={16} strokeWidth={1.75} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Name, owner and colour for a new workstream. Mounted fresh per open. */
export default function AddWorkstreamPanel({ open, defaultColor, onClose, onSave }) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [error, setError] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Add a name for this workstream.");
      return;
    }
    onSave({ name: name.trim(), owner: owner.trim(), color });
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Add workstream"
      description="Workstreams group the work into parts you can track separately."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form={FORM_ID}>Add workstream</Button>
        </>
      }
    >
      <form id={FORM_ID} className={styles.form} onSubmit={submit} noValidate>
        <Input label="Name" value={name} error={error} onChange={(e) => setName(e.target.value)} />
        <Input label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <ColorPicker value={color} onChange={setColor} />
      </form>
    </SidePanel>
  );
}

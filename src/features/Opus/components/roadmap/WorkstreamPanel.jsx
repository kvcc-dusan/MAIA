import React, { useState } from "react";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { SidePanel } from "@/components/composed/SidePanel";
import { FormGrid, FormSpan } from "@/components/composed/FormGrid";
import { Select } from "@/components/composed/Select";
import { WORKSTREAM_STATUS_OPTIONS } from "./roadmapModel";
import ColorRadioGroup from "./ColorRadioGroup";

const FORM_ID = "roadmap-workstream-form";

/** Add or edit a workstream. Mounted fresh per open by the parent. */
export default function WorkstreamPanel({ open, workstream, defaultColor, onClose, onSave, onCloseAutoFocus }) {
  const isEditing = Boolean(workstream?.id);
  const [name, setName] = useState(workstream?.name ?? "");
  const [owner, setOwner] = useState(workstream?.owner ?? "");
  const [status, setStatus] = useState(workstream?.status ?? "active");
  const [color, setColor] = useState(String(workstream?.color ?? defaultColor));
  const [error, setError] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Add a name for this workstream.");
      return;
    }
    onSave({ name: name.trim(), owner: owner.trim(), status, color });
  };

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
      title={isEditing ? "Edit workstream" : "Add workstream"}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form={FORM_ID}>{isEditing ? "Save workstream" : "Add workstream"}</Button>
        </>
      }
    >
      <FormGrid as="form" id={FORM_ID} onSubmit={handleSubmit} noValidate>
        <Input label="Name" value={name} error={error} onChange={(e) => setName(e.target.value)} />
        <Input label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <Select label="Status" value={status} options={WORKSTREAM_STATUS_OPTIONS} onChange={setStatus} />
        <ColorRadioGroup label="Color" value={color} onChange={setColor} />
      </FormGrid>
    </SidePanel>
  );
}

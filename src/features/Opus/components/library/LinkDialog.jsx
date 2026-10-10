import React, { useId, useState } from "react";
import { AppDialog } from "@/components/composed/AppDialog";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { parseLink } from "./linkModel";
import styles from "./LinkDialog.module.css";

// Mounted only while open (Radix unmounts the body), so every open starts from `link`.
function LinkForm({ formId, link, onSubmit }) {
  const [url, setUrl] = useState(link?.url ?? "");
  const [title, setTitle] = useState(link?.title ?? "");
  const [error, setError] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const parsed = parseLink(url);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    onSubmit({ ...parsed.link, title: title.trim() || parsed.link.title });
  };

  return (
    <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
      <Input
        label="Link"
        value={url}
        placeholder="figma.com/file/abc"
        inputMode="url"
        autoComplete="off"
        autoFocus
        onChange={(e) => { setUrl(e.target.value); if (error) setError(null); }}
        error={error ?? undefined}
      />
      <Input
        label="Label (optional)"
        value={title}
        placeholder="Defaults to the site name"
        autoComplete="off"
        onChange={(e) => setTitle(e.target.value)}
      />
    </form>
  );
}

/** Add (no `link`) or edit one project link. */
export default function LinkDialog({ open, link, onSubmit, onClose }) {
  const formId = useId();
  const isEdit = Boolean(link);
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      size="sm"
      title={isEdit ? "Edit link" : "Add a link"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form={formId}>{isEdit ? "Save link" : "Add link"}</Button>
        </>
      }
    >
      <LinkForm formId={formId} link={link} onSubmit={onSubmit} />
    </AppDialog>
  );
}

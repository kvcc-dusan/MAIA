import React, { useState } from "react";
import { BookOpen, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/components/composed/IconButton";
import { Menu, MenuDangerItem } from "@/components/composed/Menu";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { getVaultPath } from "@/lib/vault.js";
import styles from "./NoteHeader.module.css";

const FALLBACK_VAULT_NAME = "MAIA";

// Web has no vault path; desktop shows the folder the user picked.
const getVaultName = () => {
  try {
    const path = getVaultPath();
    const last = path?.split(/[\\/]/).filter(Boolean).pop();
    return last || FALLBACK_VAULT_NAME;
  } catch {
    return FALLBACK_VAULT_NAME;
  }
};

const formatCreated = (createdAt) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
};

/** Slim bar above a note: breadcrumb on the left, read/edit toggle and More menu on the right. */
export default function NoteHeader({ title, createdAt, content, isEditing, onToggleMode, isSource = false, onToggleView, onDelete }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const displayTitle = title?.trim() || "Untitled";
  const created = formatCreated(createdAt);

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      toast.success("Copied as markdown");
    } catch {
      toast.error("Couldn't copy. Check clipboard permission and try again.");
    }
  };

  return (
    <div className={styles.header}>
      <p className={styles.crumb}>
        <span className={styles.vault}>{getVaultName()}</span>
        <span className={styles.sep} aria-hidden="true">/</span>
        <span className={styles.title}>{displayTitle}</span>
      </p>

      <div className={styles.actions}>
        <IconButton
          label={isEditing ? "Switch to reading mode" : "Switch to editing mode"}
          icon={isEditing ? BookOpen : Pencil}
          size="icon-sm"
          onClick={onToggleMode}
        />
        <Menu.Root>
          <Menu.Trigger
            render={<IconButton icon={MoreHorizontal} size="icon-sm" label="More" tooltip={false} />}
          />
          <Menu.Content align="end">
            {created && (
              <>
                <Menu.Group>
                  <Menu.Label>Created {created}</Menu.Label>
                </Menu.Group>
                <Menu.Separator />
              </>
            )}
            <Menu.Item onClick={onToggleView}>{isSource ? "Rich view" : "Source mode"}</Menu.Item>
            <Menu.Item onClick={copyMarkdown}>Copy as markdown</Menu.Item>
            <MenuDangerItem onClick={() => setIsConfirmOpen(true)}>Delete note</MenuDangerItem>
          </Menu.Content>
        </Menu.Root>
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={`Delete "${displayTitle}"?`}
        description="This note will be removed and can't be recovered."
        confirmLabel="Delete note"
        onConfirm={onDelete}
      />
    </div>
  );
}

import React, { useState } from "react";
import { MoreHorizontal } from "@/components/icons";
import { Checkbox } from "@/components/arc/checkbox/checkbox";
import { Input } from "@/components/arc/input/input";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { DateTimeField } from "@/components/composed/DateTimeField";
import { IconButton } from "@/components/composed/IconButton";
import { Menu, MenuDangerItem } from "@/components/composed/Menu";
import ListValue from "./ListValue.jsx";
import TextValue from "./TextValue.jsx";
import { TYPE_ICONS, isEmptyValue, isListType } from "./propertyTypes.js";
import styles from "./Properties.module.css";

// DateTimeField speaks local "YYYY-MM-DDTHH:mm"; a bare date must be read as local midnight, not UTC.
const toFieldValue = (type, value) => (type === "date" ? `${value}T00:00` : value);

function KeyName({ name, isRenaming, onRename, onCancel, error }) {
  const [draft, setDraft] = useState(name);
  if (!isRenaming) return <span className={styles.keyName}>{name}</span>;
  return (
    <div className={`${styles.editor} ${styles.srLabel}`}>
      <Input
        label={`Rename ${name}`}
        aria-keyshortcuts="Enter Escape"
        value={draft}
        error={error ?? undefined}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onRename(draft);
          } else if (event.key === "Escape") {
            event.stopPropagation();
            onCancel();
          }
        }}
        onBlur={onCancel}
      />
    </div>
  );
}

function Value({ row, isEditable, autoFocus, onSet }) {
  const { key, type, value } = row;
  const set = (next) => onSet(key, { type, value: next });
  if (isListType(type)) {
    return <ListValue label={key} items={value} type={type} isEditable={isEditable} autoFocus={autoFocus} onChange={set} />;
  }
  if (type === "checkbox") {
    return <Checkbox aria-label={key} checked={value} disabled={!isEditable} onCheckedChange={(next) => set(next === true)} />;
  }
  if (type === "date" || type === "datetime") {
    return (
      <DateTimeField
        label={key}
        labelClassName="sr-only"
        dateOnly={type === "date"}
        value={toFieldValue(type, value)}
        onChange={(next) => {
          if (!next) return;
          set(type === "date" ? next.slice(0, 10) : next);
        }}
      />
    );
  }
  return <TextValue label={key} value={value} type={type} isEditable={isEditable} autoFocus={autoFocus} onCommit={set} />;
}

/** One property: type icon and name, the value editor for its type, and a menu to rename or remove it. */
export default function PropertyRow({ row, isEditable, autoFocus = false, onSet, onRemove, onRename }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const Icon = TYPE_ICONS[row.type] ?? TYPE_ICONS.text;
  const canEditValue = isEditable && row.isEditable;

  const rename = (next) => {
    const error = onRename(row.key, next);
    if (error) setRenameError(error);
    else setIsRenaming(false);
  };

  // Nothing to lose on an empty value; anything else asks first (Arc's destructive rule)
  const remove = () => (isEmptyValue(row.type, row.value) ? onRemove(row.key) : setIsConfirming(true));

  return (
    <li className={styles.row}>
      <div className={styles.key}>
        <Icon className={styles.keyIcon} size={16} strokeWidth={1.75} aria-hidden="true" />
        <KeyName
          name={row.key}
          isRenaming={isRenaming}
          error={renameError}
          onRename={rename}
          onCancel={() => {
            setIsRenaming(false);
            setRenameError(null);
          }}
        />
      </div>

      <div className={styles.value}>
        {row.isEditable ? (
          <Value row={row} isEditable={canEditValue} autoFocus={autoFocus} onSet={onSet} />
        ) : (
          <p className={styles.hint}>{row.hint}</p>
        )}
      </div>

      {isEditable && (
        <Menu.Root>
          <Menu.Trigger
            render={<IconButton icon={MoreHorizontal} size="icon-sm" label={`Options for ${row.key}`} tooltip={false} />}
          />
          <Menu.Content align="end">
            {!row.isManaged && row.isEditable && (
              <Menu.Item onClick={() => setIsRenaming(true)}>Rename property</Menu.Item>
            )}
            <MenuDangerItem onClick={remove}>Remove property</MenuDangerItem>
          </Menu.Content>
        </Menu.Root>
      )}

      <ConfirmDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}
        onClose={() => setIsConfirming(false)}
        title={`Remove ${row.key}?`}
        description="The property and its value are removed from this note."
        confirmLabel="Remove property"
        onConfirm={() => onRemove(row.key)}
      />
    </li>
  );
}

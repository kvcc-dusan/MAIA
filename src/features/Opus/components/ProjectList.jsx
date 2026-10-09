import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Shapes, Trash2 } from "lucide-react";
import { Menu, MenuDangerItem, ContextDangerItem } from "@/components/composed/Menu";
import { EmptyState } from "@/components/composed/EmptyState";
import { IconButton } from "@/components/composed/IconButton";
import { Button } from "@/components/arc/button/button";
import ProjectIcon from "@/components/ProjectIcon";
import { cn } from "@/lib/utils";
import styles from "./ProjectList.module.css";

// The menu that opened the rename returns focus to its trigger on close; the
// input waits it out so it keeps the focus it asked for.
const RENAME_FOCUS_DELAY_MS = 30;

const DROPDOWN_PARTS = { Item: Menu.Item, Separator: Menu.Separator, DangerItem: MenuDangerItem };
const CONTEXT_PARTS = { Item: Menu.ContextItem, Separator: Menu.ContextSeparator, DangerItem: ContextDangerItem };

// Right-click and the row's actions button offer the same three actions.
function ProjectMenuItems({ parts, onRename, onEditIcon, onDelete }) {
  const { Item, Separator, DangerItem } = parts;
  return (
    <>
      <Item onClick={onRename}><Pencil size={16} strokeWidth={1.75} aria-hidden="true" />Rename</Item>
      <Item onClick={onEditIcon}><Shapes size={16} strokeWidth={1.75} aria-hidden="true" />Edit icon</Item>
      <Separator />
      <DangerItem onClick={onDelete}><Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />Delete project</DangerItem>
    </>
  );
}

function RenameInput({ initialValue, onCommit, onCancel }) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);
  // Escape unmounts the input, which some browsers follow with a blur; that blur must not save.
  const isCancelled = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, RENAME_FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") onCommit(value);
    if (e.key === "Escape") {
      isCancelled.current = true;
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      value={value}
      aria-label="Rename project"
      className={styles.rename}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => { if (!isCancelled.current) onCommit(value); }}
      onKeyDown={handleKeyDown}
    />
  );
}

function ProjectRow({ project, isActive, isRail, isRenaming, handlers }) {
  const { onSelect, onStartRename, onCommitRename, onCancelRename, onEditIcon, onDelete } = handlers;
  const selectRef = useRef(null);
  const wasRenaming = useRef(false);

  // Enter or Escape unmounts the input and drops focus on the page. Give it back
  // to the row, but not when a click elsewhere ended the rename.
  useEffect(() => {
    if (wasRenaming.current && !isRenaming && document.activeElement === document.body) selectRef.current?.focus();
    wasRenaming.current = isRenaming;
  }, [isRenaming]);

  const menuActions = {
    onRename: () => onStartRename(project.id),
    onEditIcon: () => onEditIcon(project.id),
    onDelete: () => onDelete(project.id),
  };

  return (
    <li>
      <Menu.Context>
        <Menu.ContextTrigger className="contents">
          <div className={cn(styles.row, isActive && styles.rowActive)} data-rail={isRail || undefined}>
            {isRenaming ? (
              <div className={styles.select}>
                <ProjectIcon name={project.icon} size={18} color={project.iconColor} />
                <RenameInput
                  initialValue={project.name}
                  onCommit={(name) => onCommitRename(project.id, name)}
                  onCancel={onCancelRename}
                />
              </div>
            ) : (
              <button
                ref={selectRef}
                type="button"
                className={styles.select}
                aria-label={isRail ? project.name : undefined}
                aria-current={isActive ? "true" : undefined}
                title={isRail ? project.name : undefined}
                onClick={() => onSelect(project.id)}
              >
                <ProjectIcon name={project.icon} size={18} color={project.iconColor} />
                {!isRail && <span className={styles.name}>{project.name}</span>}
              </button>
            )}

            {!isRail && !isRenaming && (
              <Menu.Root>
                <Menu.Trigger
                  render={
                    <IconButton
                      icon={MoreHorizontal}
                      label={`Actions for ${project.name}`}
                      tooltip={false}
                      className={styles.actions}
                    />
                  }
                />
                <Menu.Content align="end">
                  <ProjectMenuItems parts={DROPDOWN_PARTS} {...menuActions} />
                </Menu.Content>
              </Menu.Root>
            )}
          </div>
        </Menu.ContextTrigger>
        <Menu.ContextContent>
          <ProjectMenuItems parts={CONTEXT_PARTS} {...menuActions} />
        </Menu.ContextContent>
      </Menu.Context>
    </li>
  );
}

/**
 * Active projects, then an "Archived" group for anything not Active. `isRail`
 * shows icons only. Pure presentation: the page owns selection and mutation.
 */
export default function ProjectList({ activeList, otherList, activeId, renamingId, isRail = false, onCreate, ...handlers }) {
  const renderRow = (p) => (
    <ProjectRow
      key={p.id}
      project={p}
      isActive={p.id === activeId}
      isRail={isRail}
      isRenaming={renamingId === p.id}
      handlers={handlers}
    />
  );

  return (
    <div className={styles.root}>
      {activeList.length === 0 && !isRail && (
        <EmptyState
          title="No active projects"
          description="Create one to start planning."
          action={<Button size="sm" variant="secondary" onClick={onCreate}>New project</Button>}
        />
      )}
      {activeList.length > 0 && <ul className={styles.list}>{activeList.map(renderRow)}</ul>}

      {otherList.length > 0 && !isRail && (
        <section className={styles.archived}>
          <h3 className={styles.groupTitle}>Archived</h3>
          <ul className={styles.list}>{otherList.map(renderRow)}</ul>
        </section>
      )}
    </div>
  );
}

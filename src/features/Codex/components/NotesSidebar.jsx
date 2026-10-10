import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FolderPlus, NotebookPen, SquarePen } from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/components/composed/IconButton";
import { Menu } from "@/components/composed/Menu";
import { PromptDialog } from "@/components/composed/PromptDialog";
import { ancestorPaths, buildTree, flattenTree, listFolderPaths, normalizeFolder, ROOT_LABEL } from "../folderTree.js";
import { useExpandedFolders } from "../useExpandedFolders.js";
import { useTreeKeyboard } from "../useTreeKeyboard.js";
import MoveNoteDialog from "./MoveNoteDialog.jsx";
import TreeRow from "./TreeRow.jsx";
import fileTree from "./FileTree.module.css";
import styles from "./NotesSidebar.module.css";

const NO_FOLDERS = [];
const INVALID_NAME = /[\\/]/;

const errorMessage = (error) => (error instanceof Error && error.message ? error.message : "Something went wrong.");

/**
 * The Codex file tree, rendered into the shell's secondary sidebar. Folders come
 * first, then notes, each alphabetical. `folders` lists every folder in the
 * vault (empty ones too); folders are also derived from the notes themselves.
 */
export default function NotesSidebar({
  notes,
  folders = NO_FOLDERS,
  currentNoteId,
  onOpenNote,
  onCreateNote,
  onCreateJournal,
  onCreateFolder,
  onMoveNote,
}) {
  const { expanded, toggle, setOpen, expandAll } = useExpandedFolders();
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [focusKey, setFocusKey] = useState(null);
  const [newFolderParent, setNewFolderParent] = useState(null);
  const [moving, setMoving] = useState(null);
  const [menuTarget, setMenuTarget] = useState(null);

  const tree = useMemo(() => buildTree(notes, folders), [notes, folders]);
  const rows = useMemo(() => flattenTree(tree, expanded), [tree, expanded]);
  const folderPaths = useMemo(() => listFolderPaths(tree), [tree]);

  const activeNote = useMemo(() => notes.find((n) => n.id === currentNoteId) ?? null, [notes, currentNoteId]);
  const activeFolder = activeNote ? normalizeFolder(activeNote.folder) : null;

  // Reveal the open note, but only when it changes, so the user can collapse afterwards.
  useEffect(() => {
    if (activeFolder) expandAll(ancestorPaths(activeFolder));
  }, [currentNoteId, activeFolder, expandAll]);

  const targetFolder = selectedFolder ?? activeFolder ?? "";

  const activate = useCallback(
    (row) => {
      setFocusKey(row.key);
      if (row.type === "folder") {
        setSelectedFolder(row.path);
        toggle(row.path);
      } else {
        setSelectedFolder(null);
        onOpenNote(row.note.id);
      }
    },
    [toggle, onOpenNote]
  );

  const handleClick = (event) => {
    const el = event.target.closest?.('[role="treeitem"]');
    const row = el && rows.find((r) => r.key === el.dataset.key);
    if (row) activate(row);
  };

  const handleKeyDown = useTreeKeyboard({ rows, onActivate: activate, onSetOpen: setOpen, onFocusKey: setFocusKey });

  const handleContextMenu = (event) => {
    const el = event.target.closest?.('[role="treeitem"]');
    if (!el) return setMenuTarget({ kind: "root" });
    if (el.dataset.noteId) {
      const note = notes.find((n) => n.id === el.dataset.noteId);
      return setMenuTarget(note ? { kind: "note", note } : { kind: "root" });
    }
    setMenuTarget({ kind: "folder", path: el.dataset.folderPath });
  };

  const createNoteIn = (folder) => {
    if (folder) setOpen(folder, true);
    onCreateNote?.(folder);
  };

  const validateFolderName = (name) => {
    if (INVALID_NAME.test(name)) return "Folder names can't contain slashes.";
    if (name === "." || name === "..") return "Choose a different name.";
    const path = newFolderParent ? `${newFolderParent}/${name}` : name;
    const taken = folderPaths.some((p) => p.toLowerCase() === path.toLowerCase());
    return taken ? "A folder with that name already exists here." : null;
  };

  const submitFolder = async (name) => {
    const path = newFolderParent ? `${newFolderParent}/${name}` : name;
    try {
      if (typeof onCreateFolder !== "function") throw new Error("This vault can't create folders yet.");
      await onCreateFolder(path);
    } catch (error) {
      toast.error(`Couldn't create the folder: ${errorMessage(error)}`);
      throw error;
    }
    expandAll(ancestorPaths(path));
    setSelectedFolder(path);
  };

  const moveTo = async (folder) => {
    const note = moving;
    setMoving(null);
    if (!note || normalizeFolder(note.folder) === folder) return;
    try {
      await onMoveNote?.(note.id, folder);
      if (folder) expandAll(ancestorPaths(folder));
    } catch (error) {
      toast.error(`Couldn't move the note: ${errorMessage(error)}`);
    }
  };

  const tabStopKey = rows.some((r) => r.key === focusKey)
    ? focusKey
    : (rows.find((r) => r.key === `n:${currentNoteId}`) ?? rows[0])?.key;

  const isEmpty = notes.length === 0 && folderPaths.length === 0;
  const menuFolder = menuTarget?.kind === "folder" ? menuTarget.path : targetFolder;

  return (
    <nav className={styles.sidebar} aria-label="Notes">
      <div className={styles.toolbar}>
        <IconButton icon={SquarePen} size="icon" label="New note" side="bottom" onClick={() => createNoteIn(targetFolder)} />
        <IconButton icon={NotebookPen} size="icon" label="New journal" side="bottom" onClick={onCreateJournal} />
        <IconButton icon={FolderPlus} size="icon" label="New folder" side="bottom" onClick={() => setNewFolderParent(targetFolder)} />
      </div>

      {isEmpty ? (
        <p className={styles.empty}>No notes yet. Create one with the buttons above.</p>
      ) : (
        <Menu.Context>
          <Menu.ContextTrigger className={fileTree.tree}>
            <div
              role="tree"
              aria-label="Notes and folders"
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              onContextMenu={handleContextMenu}
            >
              {rows.map((row, i) => (
                <TreeRow
                  key={row.key}
                  row={row}
                  size={rows.length}
                  position={i + 1}
                  isActive={row.type === "note" && row.note.id === currentNoteId}
                  isSelected={row.type === "folder" && row.path === selectedFolder}
                  isTabStop={row.key === tabStopKey}
                />
              ))}
            </div>
          </Menu.ContextTrigger>
          <Menu.ContextContent>
            {menuTarget?.kind === "note" ? (
              <Menu.ContextItem onClick={() => setMoving(menuTarget.note)}>Move to folder</Menu.ContextItem>
            ) : (
              <>
                <Menu.ContextItem onClick={() => createNoteIn(menuFolder)}>New note here</Menu.ContextItem>
                <Menu.ContextItem onClick={() => setNewFolderParent(menuFolder)}>New folder here</Menu.ContextItem>
              </>
            )}
          </Menu.ContextContent>
        </Menu.Context>
      )}

      <p className={styles.footer}>
        {notes.length} {notes.length === 1 ? "note" : "notes"}
      </p>

      <PromptDialog
        open={newFolderParent !== null}
        onClose={() => setNewFolderParent(null)}
        onSubmit={submitFolder}
        title="New folder"
        description={`Created in ${newFolderParent || ROOT_LABEL}.`}
        label="Folder name"
        submitLabel="Create folder"
        validate={validateFolderName}
      />
      <MoveNoteDialog note={moving} folders={folderPaths} onMove={moveTo} onClose={() => setMoving(null)} />
    </nav>
  );
}

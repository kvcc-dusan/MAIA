import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Menu } from "@/components/composed/Menu";
import { PromptDialog } from "@/components/composed/PromptDialog";
import { ancestorPaths, buildTree, flattenTree, listFolderPaths, normalizeFolder, ROOT_LABEL } from "../folderTree.js";
import { getVaultPath, isTauri } from "@/lib/vault.js";
import { useAutoReveal } from "../useAutoReveal.js";
import { useExpandedFolders } from "../useExpandedFolders.js";
import { useSortOrder } from "../useSortOrder.js";
import { useTreeKeyboard } from "../useTreeKeyboard.js";
import MoveNoteDialog from "./MoveNoteDialog.jsx";
import SidebarToolbar from "./SidebarToolbar.jsx";
import TreeRow from "./TreeRow.jsx";
import fileTree from "./FileTree.module.css";
import styles from "./NotesSidebar.module.css";

const NO_FOLDERS = [];
const INVALID_NAME = /[\\/]/;

const errorMessage = (error) => (error instanceof Error && error.message ? error.message : "Something went wrong.");

/**
 * The Codex file tree, rendered into the shell's secondary sidebar. Folders come
 * first, then notes, in the order chosen in the toolbar (A to Z by default). `folders` lists every folder in the
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
  // Keys the remembered sort; undefined = ask the vault module (no path on the web).
  vaultPath = isTauri() ? getVaultPath() : null,
}) {
  const { expanded, toggle, setOpen, expandAll, collapseAll } = useExpandedFolders();
  const [sort, setSort] = useSortOrder(vaultPath);
  const [isAutoReveal, toggleAutoReveal] = useAutoReveal();
  const [revealRequest, setRevealRequest] = useState(0);
  const isRevealPending = useRef(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [focusKey, setFocusKey] = useState(null);
  const [newFolderParent, setNewFolderParent] = useState(null);
  const [moving, setMoving] = useState(null);
  const [menuTarget, setMenuTarget] = useState(null);
  const treeRef = useRef(null);
  // The row to hand focus back to once a menu or dialog opened from it closes.
  const pendingFocus = useRef(null);
  const menuRowKey = useRef(null);
  const returnKey = useRef(null);
  const returnFocus = (event) => {
    if (!returnKey.current) return;
    event.preventDefault();
    focusRow(returnKey.current);
  };

  const tree = useMemo(() => buildTree(notes, folders, sort), [notes, folders, sort]);
  const rows = useMemo(() => flattenTree(tree, expanded), [tree, expanded]);
  const folderPaths = useMemo(() => listFolderPaths(tree), [tree]);

  const activeNote = useMemo(() => notes.find((n) => n.id === currentNoteId) ?? null, [notes, currentNoteId]);
  const activeFolder = activeNote ? normalizeFolder(activeNote.folder) : null;
  // A boolean, not the object: a reloaded notes array must not count as "the note changed".
  const hasActiveNote = activeNote !== null;

  // With auto-reveal on, follow the open note when it (or its folder) changes, or when the
  // button is switched on. Off, the tree never moves by itself. Clicks inside the tree do not
  // change these inputs, so the scroller does not jump under the user.
  useEffect(() => {
    if (!isAutoReveal || !hasActiveNote) return;
    expandAll(ancestorPaths(activeFolder));
    isRevealPending.current = true;
    setRevealRequest((n) => n + 1);
  }, [isAutoReveal, currentNoteId, activeFolder, hasActiveNote, expandAll]);

  // Scroll once the row exists; an expansion triggered above lands in the next render.
  useEffect(() => {
    if (!isRevealPending.current || !treeRef.current) return;
    const el = [...treeRef.current.querySelectorAll('[role="treeitem"]')].find((node) => node.dataset.key === `n:${currentNoteId}`);
    if (!el) return;
    isRevealPending.current = false;
    // Instant on purpose: no smooth scrolling, so reduced-motion users are covered too.
    el.scrollIntoView?.({ block: "nearest" });
  }, [rows, revealRequest, currentNoteId]);

  const flushFocus = useCallback(() => {
    const key = pendingFocus.current;
    if (!key || !treeRef.current) return;
    const el = [...treeRef.current.querySelectorAll('[role="treeitem"]')].find((node) => node.dataset.key === key);
    if (!el) return;
    pendingFocus.current = null;
    setFocusKey(key);
    el.focus();
  }, []);

  const focusRow = useCallback(
    (key) => {
      pendingFocus.current = key;
      flushFocus();
    },
    [flushFocus]
  );

  // A row that was moved or revealed may only exist after the next render.
  useEffect(flushFocus, [rows, flushFocus]);

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

  // Base UI positions the menu from the event's coordinates. A keyboard-raised
  // contextmenu event has none that are reliable, so replay one at the row.
  const openRowMenu = useCallback((row, el) => {
    const box = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true, cancelable: true, clientX: box.left + Math.min(box.width / 2, 48), clientY: box.top + box.height / 2,
    }));
  }, []);

  const handleKeyDown = useTreeKeyboard({ rows, onActivate: activate, onSetOpen: setOpen, onFocusKey: setFocusKey, onContextMenuKey: openRowMenu });

  const handleContextMenu = (event) => {
    const el = event.target.closest?.('[role="treeitem"]');
    menuRowKey.current = el?.dataset.key ?? null;
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
    if (!note) return;
    returnKey.current = `n:${note.id}`;
    if (normalizeFolder(note.folder) === folder) return;
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
  // Blank space means the vault root, not the selected or active folder.
  const menuFolder = menuTarget?.kind === "folder" ? menuTarget.path : "";

  return (
    <nav className={styles.sidebar} aria-label="Notes">
      <SidebarToolbar
        onNewNote={() => createNoteIn(targetFolder)}
        onNewJournal={onCreateJournal}
        onNewFolder={() => { returnKey.current = null; setNewFolderParent(targetFolder); }}
        sort={sort}
        onSortChange={setSort}
        isAutoReveal={isAutoReveal}
        onToggleAutoReveal={toggleAutoReveal}
        hasFolders={folderPaths.length > 0}
        isAnyExpanded={folderPaths.some((p) => expanded.has(p))}
        onToggleAllFolders={() => (folderPaths.some((p) => expanded.has(p)) ? collapseAll() : expandAll(folderPaths))}
      />

      {isEmpty ? (
        <p className={styles.empty}>No notes yet. Create one with the buttons above.</p>
      ) : (
        <Menu.Context
          onOpenChange={(open) => {
            // Escape or a pick must not strand focus on <body>; a pick that opens a dialog hands it on from here.
            if (!open && menuRowKey.current) focusRow(menuRowKey.current);
          }}
        >
          <Menu.ContextTrigger className={fileTree.tree}>
            <div
              ref={treeRef}
              role="tree"
              aria-label="Notes and folders"
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              onContextMenu={handleContextMenu}
            >
              {rows.map((row) => (
                <TreeRow
                  key={row.key}
                  row={row}
                  isActive={row.type === "note" && row.note.id === currentNoteId}
                  isSelected={row.type === "folder" && row.path === selectedFolder}
                  isTabStop={row.key === tabStopKey}
                />
              ))}
            </div>
          </Menu.ContextTrigger>
          <Menu.ContextContent>
            {menuTarget?.kind === "note" ? (
              <Menu.ContextItem onClick={() => { returnKey.current = menuRowKey.current; setMoving(menuTarget.note); }}>Move to folder</Menu.ContextItem>
            ) : (
              <>
                <Menu.ContextItem onClick={() => createNoteIn(menuFolder)}>New note here</Menu.ContextItem>
                <Menu.ContextItem onClick={() => { returnKey.current = menuRowKey.current; setNewFolderParent(menuFolder); }}>New folder here</Menu.ContextItem>
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
        onCloseAutoFocus={returnFocus}
        title="New folder"
        description={`Created in ${newFolderParent || ROOT_LABEL}.`}
        label="Folder name"
        submitLabel="Create folder"
        validate={validateFolderName}
      />
      <MoveNoteDialog
        note={moving}
        folders={folderPaths}
        onMove={moveTo}
        onClose={() => setMoving(null)}
        onCloseAutoFocus={returnFocus}
      />
    </nav>
  );
}

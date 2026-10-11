import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { IconButton } from "@/components/composed/IconButton";
import { Menu } from "@/components/composed/Menu";
import { tabTitle } from "../codexTabs.js";
import { CODEX_PANEL_ID, codexTabId } from "./tabIds.js";
import styles from "./CodexTabStrip.module.css";

const NEXT_KEYS = { ArrowRight: 1, ArrowLeft: -1 };
// Below this a press is a click: a tab must not start a drag on a plain click.
const POINTER_DISTANCE = 6;
// Click fires after pointerup in the same task, so a short timeout keeps a drop from activating the tab.
const DRAG_CLICK_GUARD_MS = 0;
const KEYBOARD_DRAG = { start: ["Space"], cancel: ["Escape"], end: ["Space"] };

const positionOf = (tabs, id) => tabs.findIndex((t) => t.id === id) + 1;

/** Screen reader copy for a drag. Sentence case, no colons. */
const buildAccessibility = (tabs, notes) => {
  const titleOf = (id) => {
    const tab = tabs.find((t) => t.id === id);
    return tab ? tabTitle(tab, notes) : "Tab";
  };
  const total = tabs.length;
  const pickedUp = ({ active }) => `Picked up ${titleOf(active.id)}, position ${positionOf(tabs, active.id)} of ${total}.`;
  return {
    screenReaderInstructions: {
      draggable: "To move a tab, press Space to pick it up, use the left and right arrow keys, then press Space to drop it or Escape to cancel.",
    },
    announcements: {
      onDragStart: pickedUp,
      // dnd-kit reports the lift itself as an over event; repeat the pick-up so it is not lost.
      onDragOver: (args) => {
        const { active, over } = args;
        if (over && over.id === active.id) return pickedUp(args);
        return over
          ? `${titleOf(active.id)} is now at position ${positionOf(tabs, over.id)} of ${total}.`
          : `${titleOf(active.id)} is not over a tab position.`;
      },
      onDragEnd: ({ active, over }) => (over && over.id !== active.id
        ? `Dropped ${titleOf(active.id)} at position ${positionOf(tabs, over.id)} of ${total}.`
        : `Dropped ${titleOf(active.id)} in its original position.`),
      onDragCancel: ({ active }) => `Move cancelled. ${titleOf(active.id)} is back at position ${positionOf(tabs, active.id)} of ${total}.`,
    },
  };
};

/**
 * One sortable tab. The tab button is the drag activator (not the wrapper), so
 * the close button sits outside the drag and keeps its click.
 */
function SortableTab({ tab, title, isActive, isRoving, onActivate, onClose, onFocus, onKeyDown, onKeyUp }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useSortable({ id: tab.id });
  // dnd-kit's keydown starts the keyboard drag; our roving handler chains after it.
  const { onKeyDown: onDragKeyDown, ...dragListeners } = listeners ?? {};

  return (
    <div
      ref={setNodeRef}
      className={styles.tab}
      role="presentation"
      data-active={isActive || undefined}
      data-dragging={isDragging || undefined}
      style={transform ? { transform: `translate3d(${transform.x}px, 0, 0)` } : undefined}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...dragListeners}
        role="tab"
        className={styles.label}
        id={codexTabId(tab.id)}
        data-tab-id={tab.id}
        aria-selected={isActive}
        aria-controls={isActive ? CODEX_PANEL_ID : undefined}
        aria-keyshortcuts="Delete"
        tabIndex={isRoving ? 0 : -1}
        title={title}
        onClick={() => onActivate(tab.id)}
        onFocus={() => onFocus(tab.id)}
        onKeyDown={(e) => {
          onDragKeyDown?.(e);
          onKeyDown(e, tab);
        }}
        onKeyUp={onKeyUp}
        onMouseDown={(e) => e.button === 1 && e.preventDefault()}
        onAuxClick={(e) => {
          if (e.button !== 1) return;
          e.preventDefault();
          onClose(tab.id);
        }}
      >
        <span className={styles.title}>{title}</span>
      </button>
      <IconButton
        icon={X}
        size="icon-xs"
        label={`Close ${title}`}
        tooltip={false}
        tabIndex={-1}
        className={styles.close}
        onClick={() => onClose(tab.id)}
      />
    </div>
  );
}

/**
 * Obsidian-style tab strip for the shell top bar. The tab and its close button
 * are siblings inside a presentational wrapper: a button nested in role=tab
 * would be an interactive control inside an interactive control.
 */
export default function CodexTabStrip({ tabs, activeId, notes, onActivate, onClose, onNewTab, onMove }) {
  const scrollerRef = useRef(null);
  const refocusRef = useRef(false);
  const pendingFocusRef = useRef(null);
  const draggingRef = useRef(false);
  const keyboardDragRef = useRef(false);
  // A keyboard drag's Space keyup (lift and drop) would click the tab. Each of
  // those keyups is consumed here so the tab only changes on a real activation.
  const swallowSpaceUpRef = useRef(false);
  const [focusId, setFocusId] = useState(null);

  const rovingId = tabs.some((t) => t.id === focusId) ? focusId : activeId;
  const tabEl = useCallback(
    (id) => scrollerRef.current?.querySelector(`[role="tab"][data-tab-id="${id}"]`),
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: POINTER_DISTANCE } }),
    useSensor(KeyboardSensor, { keyboardCodes: KEYBOARD_DRAG, coordinateGetter: sortableKeyboardCoordinates }),
  );
  const accessibility = useMemo(() => buildAccessibility(tabs, notes), [tabs, notes]);
  const sortableIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  // Keep the active tab visible when the strip overflows. Manual scrollLeft:
  // scrollIntoView could also scroll the page frame.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const wrapper = tabEl(activeId)?.parentElement;
    if (!scroller || !wrapper) return;
    const left = wrapper.offsetLeft;
    const right = left + wrapper.offsetWidth;
    if (left < scroller.scrollLeft) scroller.scrollLeft = left;
    else if (right > scroller.scrollLeft + scroller.clientWidth) scroller.scrollLeft = right - scroller.clientWidth;
  }, [activeId, tabs.length, tabEl]);

  // After a keyboard close the focused element is gone; land on the active tab.
  useEffect(() => {
    if (!refocusRef.current) return;
    refocusRef.current = false;
    tabEl(activeId)?.focus();
  }, [tabs, activeId, tabEl]);

  // A keyboard move re-orders the DOM under focus; put focus back on the moved tab.
  useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;
    pendingFocusRef.current = null;
    tabEl(id)?.focus();
  }, [tabs, tabEl]);

  const moveFocus = (id) => {
    setFocusId(id);
    tabEl(id)?.focus();
  };

  const handleKeyDown = (event, tab, index) => {
    // During a drag the arrows move the tab, not the focus.
    if (draggingRef.current) return;
    if (event.key in NEXT_KEYS) {
      event.preventDefault();
      moveFocus(tabs[(index + NEXT_KEYS[event.key] + tabs.length) % tabs.length].id);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus(tabs[0].id);
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus(tabs[tabs.length - 1].id);
    } else if (event.key === "Delete") {
      event.preventDefault();
      refocusRef.current = true;
      onClose(tab.id);
    }
    // Enter and Space activate through the button's own click.
  };

  const handleKeyUp = (event) => {
    if (event.key !== " " || !swallowSpaceUpRef.current) return;
    event.preventDefault();
    swallowSpaceUpRef.current = false;
  };

  // Clicks while a drag is in progress, or right after a pointer drop, are not activations.
  const handleActivate = (id) => {
    if (!draggingRef.current) onActivate(id);
  };

  const handleDragStart = ({ activatorEvent }) => {
    draggingRef.current = true;
    keyboardDragRef.current = activatorEvent?.type === "keydown";
    if (keyboardDragRef.current) swallowSpaceUpRef.current = true;
  };

  const releaseDrag = () => {
    setTimeout(() => {
      draggingRef.current = false;
    }, DRAG_CLICK_GUARD_MS);
  };

  const handleDragEnd = ({ active, over }) => {
    const isKeyboard = keyboardDragRef.current;
    const moved = Boolean(over) && over.id !== active.id;
    if (isKeyboard) swallowSpaceUpRef.current = true;
    if (moved) {
      if (isKeyboard) pendingFocusRef.current = active.id;
      onMove(active.id, over.id);
    } else if (isKeyboard) {
      // Space to lift and Space to drop with no move is a plain activation.
      onActivate(active.id);
    }
    releaseDrag();
  };

  const handleDragCancel = () => {
    keyboardDragRef.current = false;
    releaseDrag();
  };

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusId(null);
  };

  return (
    <div className={styles.root}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={accessibility}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
          <div
            ref={scrollerRef}
            className={styles.scroller}
            role="tablist"
            aria-label="Codex tabs"
            onBlur={handleBlur}
          >
            {tabs.map((tab, index) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                title={tabTitle(tab, notes)}
                isActive={tab.id === activeId}
                isRoving={tab.id === rovingId}
                onActivate={handleActivate}
                onClose={onClose}
                onFocus={setFocusId}
                onKeyDown={(e, t) => handleKeyDown(e, t, index)}
                onKeyUp={handleKeyUp}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <IconButton icon={Plus} size="icon-sm" label="New tab" side="bottom" className={styles.add} onClick={onNewTab} />

      <div className={styles.drag} data-tauri-drag-region />

      <Menu.Root>
        <Menu.Trigger
          render={<IconButton icon={ChevronDown} size="icon-sm" label="All tabs" tooltip={false} className={styles.add} />}
        />
        <Menu.Content align="end">
          {tabs.map((tab) => (
            <Menu.Item key={tab.id} onClick={() => onActivate(tab.id)} aria-current={tab.id === activeId || undefined}>
              {tabTitle(tab, notes)}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Root>
    </div>
  );
}

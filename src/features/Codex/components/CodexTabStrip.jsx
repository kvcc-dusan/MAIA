import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { IconButton } from "@/components/composed/IconButton";
import { Menu } from "@/components/composed/Menu";
import { tabTitle } from "../codexTabs.js";
import { CODEX_PANEL_ID, codexTabId } from "./tabIds.js";
import styles from "./CodexTabStrip.module.css";

const NEXT_KEYS = { ArrowRight: 1, ArrowLeft: -1 };

/**
 * Obsidian-style tab strip for the shell top bar. The tab and its close button
 * are siblings inside a presentational wrapper: a button nested in role=tab
 * would be an interactive control inside an interactive control.
 */
export default function CodexTabStrip({ tabs, activeId, notes, onActivate, onClose, onNewTab }) {
  const scrollerRef = useRef(null);
  const refocusRef = useRef(false);
  const [focusId, setFocusId] = useState(null);

  const rovingId = tabs.some((t) => t.id === focusId) ? focusId : activeId;
  const tabEl = useCallback(
    (id) => scrollerRef.current?.querySelector(`[role="tab"][data-tab-id="${id}"]`),
    []
  );

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

  const moveFocus = (id) => {
    setFocusId(id);
    tabEl(id)?.focus();
  };

  const handleKeyDown = (event, tab, index) => {
    if (event.key in NEXT_KEYS) {
      event.preventDefault();
      moveFocus(tabs[(index + NEXT_KEYS[event.key] + tabs.length) % tabs.length].id);
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus(tabs[0].id);
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus(tabs[tabs.length - 1].id);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      refocusRef.current = true;
      onClose(tab.id);
    }
    // Enter and Space activate through the button's own click.
  };

  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusId(null);
  };

  return (
    <div className={styles.root}>
      <div
        ref={scrollerRef}
        className={styles.scroller}
        role="tablist"
        aria-label="Codex tabs"
        onBlur={handleBlur}
      >
        {tabs.map((tab, index) => {
          const title = tabTitle(tab, notes);
          const isActive = tab.id === activeId;
          return (
            <div key={tab.id} className={styles.tab} role="presentation" data-active={isActive || undefined}>
              <button
                type="button"
                role="tab"
                className={styles.label}
                id={codexTabId(tab.id)}
                data-tab-id={tab.id}
                aria-selected={isActive}
                aria-controls={isActive ? CODEX_PANEL_ID : undefined}
                aria-keyshortcuts="Delete Backspace"
                tabIndex={tab.id === rovingId ? 0 : -1}
                title={title}
                onClick={() => onActivate(tab.id)}
                onFocus={() => setFocusId(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab, index)}
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
        })}
      </div>

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

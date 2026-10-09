import React, { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/composed/Menu";
import { WIDGETS, WIDGETS_BY_ID } from "./widgets";
import { Check, Pencil, Plus } from "lucide-react";

/**
 * The Today dashboard grid.
 *
 * Five columns on desktop, two on tablet, one on mobile. Widgets occupy one or
 * two columns and are reordered by dragging in edit mode.
 *
 * The greeting is the page's hero header: it anchors the top-left with the
 * edit controls top-right, and the grid below stretches to fill the remaining
 * height (`auto-rows-fr`) so the window never shows a dead middle. The desktop
 * dock is a floating overlay, so the root reserves its height as bottom
 * padding — content that reaches the bottom must clear it.
 */

const SPAN_CLASS = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
};

function SortableWidget({ entry, isEditing, widgetProps, onToggleSpan, onRemove }) {
  const def = WIDGETS_BY_ID[entry.id];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    disabled: !isEditing,
  });

  if (!def) return null;
  const { Component } = def;
  const ownProps = def.select ? def.select(widgetProps) : widgetProps;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("col-span-1", SPAN_CLASS[entry.span], def.minHeight, isDragging && "z-dialog")}
    >
      <Component
        {...ownProps}
        title={def.title}
        isEditing={isEditing}
        span={entry.span}
        canGrow={def.canGrow}
        isDragging={isDragging}
        onToggleSpan={() => onToggleSpan(entry.id)}
        onRemove={() => onRemove(entry.id)}
        dragHandleProps={{ ...attributes, ...listeners }}
        className="h-full"
      />
    </div>
  );
}

export default function TodayGrid({ layout, setLayout, greeting, agenda, widgetProps }) {
  const [isEditing, setIsEditing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // Without this, reordering is mouse-only.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => layout.map((l) => l.id), [layout]);
  const missing = useMemo(
    () => WIDGETS.filter((w) => !ids.includes(w.id)),
    [ids]
  );

  const handleDragEnd = useCallback(
    ({ active, over }) => {
      if (!over || active.id === over.id) return;
      setLayout((prev) => {
        const from = prev.findIndex((l) => l.id === active.id);
        const to = prev.findIndex((l) => l.id === over.id);
        return from === -1 || to === -1 ? prev : arrayMove(prev, from, to);
      });
    },
    [setLayout]
  );

  const toggleSpan = useCallback(
    (id) => setLayout((prev) => prev.map((l) => (l.id === id ? { ...l, span: l.span === 1 ? 2 : 1 } : l))),
    [setLayout]
  );

  const remove = useCallback(
    (id) => setLayout((prev) => prev.filter((l) => l.id !== id)),
    [setLayout]
  );

  const add = useCallback(
    (id) => setLayout((prev) => [...prev, { id, span: WIDGETS_BY_ID[id]?.defaultSpan ?? 1 }]),
    [setLayout]
  );

  return (
    // Mobile reserves the tab-bar height one level up (App wraps <main> with
    // pb-(--dock-h)); only the desktop floating dock needs explicit clearance.
    <div className="flex w-full flex-col gap-6 px-page py-8 md:pb-[calc(var(--spacing-page)+var(--dock-h-desktop))]">
      {/* Hero header — greeting top-left, layout controls top-right. */}
      <header className="flex flex-none items-start justify-between gap-4">
        {greeting}
        <div className="flex flex-none items-center gap-2 pt-1">
          {isEditing && missing.length > 0 && (
            <Menu.Root>
              <Menu.Trigger
                render={
                  <Button variant="outline" size="sm">
                    <Plus className="size-4" /> Add widget
                  </Button>
                }
              />
              <Menu.Content align="end">
                {missing.map((w) => (
                  <Menu.Item key={w.id} onClick={() => add(w.id)}>
                    {w.title}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Root>
          )}
          <Button
            variant={isEditing ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsEditing((v) => !v)}
            aria-pressed={isEditing}
          >
            {isEditing ? <Check className="size-4" /> : <Pencil className="size-4" />}
            {isEditing ? "Done" : "Edit"}
          </Button>
        </div>
      </header>

      {/* Fixed section: not part of the layout array, so it can't be dragged,
          resized or removed. The customisable widgets live below it. */}
      {agenda}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          {/* Rows are sized by their content. This was `flex-1 auto-rows-fr`,
              which made the single row absorb all leftover viewport height —
              so every widget rendered ~full-window tall no matter how little
              was in it. The min-h floors in the registry are floors, not
              targets. Cards still stretch to equal height within a row. */}
          <div className="grid min-h-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {layout.map((entry) => (
              <SortableWidget
                key={entry.id}
                entry={entry}
                isEditing={isEditing}
                widgetProps={widgetProps}
                onToggleSpan={toggleSpan}
                onRemove={remove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

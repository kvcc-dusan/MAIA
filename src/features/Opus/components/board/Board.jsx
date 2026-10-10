import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, MeasuringStrategy, TouchSensor,
  closestCenter, getFirstCollision, pointerWithin, rectIntersection, useSensor, useSensors,
} from "@dnd-kit/core";
import { useReducedMotion } from "motion/react";
import BoardColumn from "./BoardColumn";
import { OverlayCard } from "./TaskCard";
import { MousePenSensor, createCoordinateGetter } from "./sensors";
import {
  SCREEN_READER_INSTRUCTIONS, applyMove, buildAnnouncements, findStatus, positionOf, resolveDrop, sameColumns,
} from "./dnd";
import { STATUS_ORDER } from "./model";
import styles from "./Board.module.css";

const POINTER_DISTANCE = 6;
const TOUCH_DELAY_MS = 250;
const TOUCH_TOLERANCE_PX = 8;

const isBelow = (active, over) => {
  const rect = active.rect.current.translated;
  return Boolean(rect) && rect.top > over.rect.top + over.rect.height;
};

/**
 * The four columns and all drag behaviour. `columns` is the model from
 * buildColumns; the board keeps a local arrangement only while a card is held,
 * and reports the final spot through `onDrop` (it writes nothing itself).
 */
export default function Board({ columns, workstreamsById, today, showOwner, showAllDone, onOpen, onMoveTo, onAdd, onToggleShowAll, onDrop }) {
  const reduced = useReducedMotion();
  const baseIds = useMemo(() => Object.fromEntries(STATUS_ORDER.map((s) => [s, columns[s].tasks.map((t) => t.id)])), [columns]);
  const tasksById = useMemo(() => new Map(STATUS_ORDER.flatMap((s) => columns[s].tasks).map((t) => [t.id, t])), [columns]);

  const [live, setLive] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const ids = live ?? baseIds;
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const originRef = useRef(null);
  const lastOverId = useRef(null);
  const justMovedColumns = useRef(false);
  const isKeyboardDrag = useRef(false);

  const coordinateGetter = useMemo(() => createCoordinateGetter(() => idsRef.current), []);
  const sensors = useSensors(
    useSensor(MousePenSensor, { activationConstraint: { distance: POINTER_DISTANCE } }),
    useSensor(TouchSensor, { activationConstraint: { delay: TOUCH_DELAY_MS, tolerance: TOUCH_TOLERANCE_PX } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] }, coordinateGetter }),
  );

  // Pointer first, then rects (keyboard has no pointer). Over a column with cards, use its nearest card.
  const collisionDetection = useCallback((args) => {
    const hits = pointerWithin(args);
    const found = hits.length > 0 ? hits : rectIntersection(args);
    let overId = getFirstCollision(found, "id");
    if (overId != null) {
      if (STATUS_ORDER.includes(overId) && idsRef.current[overId].length > 0) {
        const inColumn = idsRef.current[overId];
        overId = closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((c) => c.id !== overId && inColumn.includes(c.id)),
        })[0]?.id ?? overId;
      }
      lastOverId.current = overId;
      return [{ id: overId }];
    }
    if (justMovedColumns.current) lastOverId.current = args.active?.id ?? null;
    return lastOverId.current ? [{ id: lastOverId.current }] : [];
  }, []);

  const destinationOf = useCallback((active, over) => {
    const cols = idsRef.current;
    const drop = resolveDrop(cols, active.id, over.id, { isBelowOver: isBelow(active, over) });
    if (!drop) return null;
    const next = applyMove(cols, active.id, drop);
    return { status: drop.status, position: drop.index + 1, total: next[drop.status].length };
  }, []);

  const accessibility = useMemo(() => ({
    screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
    announcements: buildAnnouncements({
      titleOf: (id) => tasksById.get(id)?.title || "task",
      originOf: () => originRef.current,
      destinationOf,
    }),
  }), [tasksById, destinationOf]);

  const handleDragStart = ({ active, activatorEvent }) => {
    isKeyboardDrag.current = activatorEvent?.type === "keydown";
    setActiveId(active.id);
    setLive(baseIds);
    originRef.current = positionOf(baseIds, active.id);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const cols = idsRef.current;
    const drop = resolveDrop(cols, active.id, over.id, { isBelowOver: isBelow(active, over) });
    if (!drop) return;
    // Keyboard steps read the live arrangement, so within-column steps must land in it too.
    // Pointer drags leave same-column order to the sortable strategy until drop.
    if (findStatus(cols, active.id) === drop.status && !isKeyboardDrag.current) return;
    const next = applyMove(cols, active.id, drop);
    if (sameColumns(next, cols)) return;
    justMovedColumns.current = true;
    setLive(next);
    requestAnimationFrame(() => { justMovedColumns.current = false; });
  };

  const reset = () => { setActiveId(null); setLive(null); lastOverId.current = null; };

  const handleDragEnd = ({ active, over }) => {
    const cols = idsRef.current;
    const drop = over ? resolveDrop(cols, active.id, over.id, { isBelowOver: isBelow(active, over) }) : null;
    const final = drop ? applyMove(cols, active.id, drop) : null;
    reset();
    if (!final || sameColumns(final, baseIds)) return;
    const list = final[drop.status];
    const at = list.indexOf(active.id);
    onDrop({ taskId: active.id, status: drop.status, prevId: list[at - 1] ?? null, nextId: list[at + 1] ?? null });
  };

  const activeTask = activeId ? tasksById.get(activeId) : null;
  const activeStatus = activeId ? findStatus(ids, activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={accessibility}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={reset}
    >
      <div className={styles.scroller} data-dragging={activeId ? "" : undefined}>
        <div className={styles.board}>
          {STATUS_ORDER.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              ids={ids[status]}
              tasksById={tasksById}
              workstreamsById={workstreamsById}
              today={today}
              total={columns[status].total}
              hidden={columns[status].hidden}
              showOwner={showOwner}
              showAllDone={showAllDone}
              isTarget={activeStatus === status}
              onOpen={onOpen}
              onMoveTo={onMoveTo}
              onAdd={onAdd}
              onToggleShowAll={onToggleShowAll}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={reduced ? null : undefined} zIndex="var(--z-overlay)">
        {activeTask ? <OverlayCard task={activeTask} workstream={workstreamsById.get(activeTask.workstreamId)} today={today} showOwner={showOwner} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

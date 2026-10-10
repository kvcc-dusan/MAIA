import { PointerSensor } from "@dnd-kit/core";
import { nextKeyboardTarget } from "./dnd.js";

/**
 * Mouse and pen only. Touch drags need a long press (TouchSensor) so the board
 * still scrolls under a finger; PointerSensor would start dragging on any move.
 */
export class MousePenSensor extends PointerSensor {
  static activators = [{
    eventName: "onPointerDown",
    handler: ({ nativeEvent: e }, { onActivation }) => {
      if (!e.isPrimary || e.button !== 0 || e.pointerType === "touch") return false;
      onActivation?.({ event: e });
      return true;
    },
  }];
}

const ARROWS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

/**
 * Keyboard coordinates with the hub's flow: up and down step inside a column,
 * left and right jump to the neighbouring column at the same position.
 * `getColumns` reads the live arrangement (a ref), so it follows every move.
 */
export const createCoordinateGetter = (getColumns) => (event, { context: { active, droppableRects, collisionRect } }) => {
  if (!ARROWS.includes(event.code)) return undefined;
  event.preventDefault();
  if (!active || !collisionRect) return undefined;
  const target = nextKeyboardTarget(getColumns(), active.id, event.code);
  if (!target) return undefined;
  if (target.type === "item") {
    const rect = droppableRects.get(target.id);
    return rect ? { x: rect.left, y: rect.top } : undefined;
  }
  if (target.type === "column") {
    const rect = droppableRects.get(target.status);
    return rect ? { x: rect.left, y: rect.top } : undefined;
  }
  const last = droppableRects.get(target.lastId);
  return last ? { x: last.left, y: last.bottom + 1 } : undefined;
};

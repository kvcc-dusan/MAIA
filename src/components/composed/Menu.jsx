import * as React from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

/**
 * Menus.
 *
 * MAIA had four separate implementations of this: hand-rolled cursor-anchored
 * menus in NotesPage and LedgerPage, portalled hand-rolled ones in
 * ProjectsPage / ExecutionPanel / DailyTimeline, and Radix ContextMenu in
 * TaskRow / SignalRow — with different radii, backgrounds and z-indexes.
 *
 * Both flavours are re-exported from here so callers pick by interaction
 * (click vs right-click) and get identical styling either way. Positioning,
 * collision handling, keyboard nav and dismissal all come from Base UI, which
 * removes the getBoundingClientRect maths those five files each reimplemented.
 */

/** Right-click menu. Wrap the target in <Menu.ContextTrigger>. */
const Menu = {
  Context: ContextMenu,
  ContextTrigger: ContextMenuTrigger,
  ContextContent: ContextMenuContent,
  ContextItem: ContextMenuItem,
  // Base UI's group label throws outside a group ("MenuGroupContext is
  // missing") — right-clicking a session block used to gray-screen the whole
  // app because of exactly that. The label owns its group now.
  ContextLabel: (props) => (
    <ContextMenuGroup>
      <ContextMenuLabel {...props} />
    </ContextMenuGroup>
  ),
  ContextGroup: ContextMenuGroup,
  ContextSeparator: ContextMenuSeparator,
  ContextShortcut: ContextMenuShortcut,
  ContextSub: ContextMenuSub,
  ContextSubTrigger: ContextMenuSubTrigger,
  ContextSubContent: ContextMenuSubContent,

  Root: DropdownMenu,
  Trigger: DropdownMenuTrigger,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  Label: DropdownMenuLabel,
  Group: DropdownMenuGroup,
  Separator: DropdownMenuSeparator,
  Shortcut: DropdownMenuShortcut,
  Sub: DropdownMenuSub,
  SubTrigger: DropdownMenuSubTrigger,
  SubContent: DropdownMenuSubContent,
};

/**
 * Destructive menu entry. Every menu in the app has at least one Delete, and
 * they were each styled ad hoc — this makes the treatment consistent.
 */
function MenuDangerItem({ className, ...props }) {
  return (
    <DropdownMenuItem
      variant="destructive"
      className={cn(className)}
      {...props}
    />
  );
}

function ContextDangerItem({ className, ...props }) {
  return (
    <ContextMenuItem
      variant="destructive"
      className={cn(className)}
      {...props}
    />
  );
}

export { Menu, MenuDangerItem, ContextDangerItem };

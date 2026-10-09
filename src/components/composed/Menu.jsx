import * as React from "react";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./Menu.module.css";

/**
 * Menus.
 *
 * Arc's dropdown-menu and context-menu are data-driven (an `items` array),
 * which can't express MAIA's compound API (arbitrary children, submenus,
 * Base UI `render` triggers, `data-popup-open`). So this stays on Base UI and
 * is styled to the kvcc-arc "Menus and popovers" rules via Menu.module.css.
 *
 * Both flavours share one set of parts so click and right-click menus look
 * identical. Positioning, collision handling, keyboard nav and dismissal all
 * come from Base UI.
 */

/** Builds the part set for one Base UI menu flavour. */
const createParts = (Primitive) => {
  const { Portal, Positioner, Popup, Item: PrimitiveItem, GroupLabel, Separator: PrimitiveSeparator, SubmenuTrigger } = Primitive;

  const Content = ({ className, align = "start", alignOffset = 0, side = "bottom", sideOffset = 4, ...props }) => (
    <Portal>
      <Positioner
        className={styles.positioner}
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <Popup className={cn(styles.popup, className)} {...props} />
      </Positioner>
    </Portal>
  );

  const Item = ({ className, variant = "default", inset, ...props }) => (
    <PrimitiveItem
      data-inset={inset}
      className={cn(styles.item, variant === "destructive" && styles.danger, className)}
      {...props}
    />
  );

  const Label = ({ className, inset, ...props }) => (
    <GroupLabel data-inset={inset} className={cn(styles.label, className)} {...props} />
  );

  const Separator = ({ className, ...props }) => (
    <PrimitiveSeparator className={cn(styles.separator, className)} {...props} />
  );

  const Shortcut = ({ className, ...props }) => (
    <span className={cn(styles.shortcut, className)} {...props} />
  );

  const SubTrigger = ({ className, inset, children, ...props }) => (
    <SubmenuTrigger data-inset={inset} className={cn(styles.subTrigger, className)} {...props}>
      {children}
      <ChevronRight className={styles.chevron} size={16} strokeWidth={1.75} aria-hidden="true" />
    </SubmenuTrigger>
  );

  return { Content, Item, Label, Separator, Shortcut, SubTrigger };
};

const dropdown = createParts(BaseMenu);
const context = createParts(BaseContextMenu);

const ContextContent = ({ side = "right", alignOffset = 4, sideOffset = 0, ...props }) => (
  <context.Content side={side} alignOffset={alignOffset} sideOffset={sideOffset} {...props} />
);

const SubContent = ({ side = "right", alignOffset = -4, sideOffset = 0, ...props }) => (
  <dropdown.Content side={side} alignOffset={alignOffset} sideOffset={sideOffset} {...props} />
);

const ContextSubContent = ({ side = "right", alignOffset = -4, sideOffset = 0, ...props }) => (
  <context.Content side={side} alignOffset={alignOffset} sideOffset={sideOffset} {...props} />
);

const ContextTrigger = ({ className, ...props }) => (
  <BaseContextMenu.Trigger className={cn(styles.contextTrigger, className)} {...props} />
);

// Base UI's group label throws outside a group ("MenuGroupContext is
// missing"), right-clicking a session block used to gray-screen the whole
// app because of exactly that. The label owns its group now.
const ContextLabel = (props) => (
  <BaseContextMenu.Group>
    <context.Label {...props} />
  </BaseContextMenu.Group>
);

/** Right-click menu. Wrap the target in <Menu.ContextTrigger>. */
const Menu = {
  Context: BaseContextMenu.Root,
  ContextTrigger,
  ContextContent,
  ContextItem: context.Item,
  ContextLabel,
  ContextGroup: BaseContextMenu.Group,
  ContextSeparator: context.Separator,
  ContextShortcut: context.Shortcut,
  ContextSub: BaseContextMenu.SubmenuRoot,
  ContextSubTrigger: context.SubTrigger,
  ContextSubContent,

  Root: BaseMenu.Root,
  Trigger: BaseMenu.Trigger,
  Content: dropdown.Content,
  Item: dropdown.Item,
  Label: dropdown.Label,
  Group: BaseMenu.Group,
  Separator: dropdown.Separator,
  Shortcut: dropdown.Shortcut,
  Sub: BaseMenu.SubmenuRoot,
  SubTrigger: dropdown.SubTrigger,
  SubContent,
};

/**
 * Destructive menu entry. Every menu in the app has at least one Delete, and
 * they were each styled ad hoc, this makes the treatment consistent.
 */
const MenuDangerItem = (props) => <dropdown.Item variant="destructive" {...props} />;

const ContextDangerItem = (props) => <context.Item variant="destructive" {...props} />;

export { Menu, MenuDangerItem, ContextDangerItem };

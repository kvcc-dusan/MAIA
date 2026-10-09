import { Menu, ContextDangerItem } from "@/components/composed/Menu";
import { Delete01 as Trash2, Pin, Pen01 as PenLine, Circle } from "@/components/ui/CustomIcon.jsx";
import { DecisionCard } from "./DecisionCard";

// DecisionCard calls an `onContextMenu` prop for both real right-clicks and
// its synthetic long-press event. The actual menu is owned by the
// Menu.ContextTrigger below, which opens natively for both gestures; this
// stub only keeps that contract satisfied.
function handleCardContextMenu(e) {
    e.preventDefault();
}

/**
 * One decision card wrapped in the app's context-menu primitive.
 *
 * Menu.ContextTrigger owns opening: right-click and touch long-press both
 * anchor the portalled popup at the pointer. In select mode the same menu
 * switches to the bulk actions.
 */
export function DecisionCardMenu({ d, selectMode, selectedCount, cardProps, actions }) {
    return (
        <Menu.Context>
            <Menu.ContextTrigger className="contents">
                <DecisionCard {...cardProps} onContextMenu={handleCardContextMenu} />
            </Menu.ContextTrigger>

            <Menu.ContextContent>
                {selectMode ? (
                    <>
                        <Menu.ContextLabel>{selectedCount} selected</Menu.ContextLabel>
                        <Menu.ContextItem onClick={actions.bulkPin}>
                            <Pin />
                            Pin all
                        </Menu.ContextItem>
                        <Menu.ContextItem onClick={actions.bulkUnpin}>
                            <Pin />
                            Unpin all
                        </Menu.ContextItem>
                        <Menu.ContextSeparator />
                        <ContextDangerItem onClick={actions.bulkDelete}>
                            <Trash2 />
                            Delete selected
                        </ContextDangerItem>
                    </>
                ) : (
                    <>
                        <Menu.ContextItem onClick={() => actions.togglePin(d.id)}>
                            <Pin />
                            {cardProps.isPinned ? "Unpin decision" : "Pin decision"}
                        </Menu.ContextItem>
                        <Menu.ContextItem onClick={() => actions.edit(d.id)}>
                            <PenLine />
                            Edit
                        </Menu.ContextItem>
                        <Menu.ContextItem onClick={() => actions.rename(d.id)}>
                            <PenLine />
                            Rename
                        </Menu.ContextItem>
                        <Menu.ContextItem onClick={() => actions.select(d.id)}>
                            <Circle />
                            Select
                        </Menu.ContextItem>
                        <Menu.ContextSeparator />
                        <ContextDangerItem onClick={() => actions.delete(d.id)}>
                            <Trash2 />
                            Delete
                        </ContextDangerItem>
                    </>
                )}
            </Menu.ContextContent>
        </Menu.Context>
    );
}

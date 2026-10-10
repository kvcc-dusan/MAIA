import React from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Menu, MenuDangerItem } from "@/components/composed/Menu";
import { IconButton } from "@/components/composed/IconButton";
import { workstreamMenuId } from "./roadmapModel";

/** Edit and delete for one workstream. The trigger id lets the tab hand focus back after the panel closes. */
export default function WorkstreamMenu({ workstream, onEdit, onDelete }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        render={
          <IconButton
            id={workstreamMenuId(workstream.id)}
            icon={MoreHorizontal}
            label={`Actions for ${workstream.name}`}
            tooltip={false}
          />
        }
      />
      <Menu.Content align="end">
        <Menu.Item onClick={() => onEdit(workstream.id)}>
          <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />Edit workstream
        </Menu.Item>
        <Menu.Separator />
        <MenuDangerItem onClick={() => onDelete(workstream.id)}>
          <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />Delete workstream
        </MenuDangerItem>
      </Menu.Content>
    </Menu.Root>
  );
}

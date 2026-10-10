import React from "react";
import { Pencil, Unlink } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { Badge } from "@/components/arc/badge/badge";
import { IconButton } from "@/components/composed/IconButton";
import { ListRow, StatusBadge } from "../../kit";
import { docKindLabel } from "../../lib/docModel";
import { docSubtitle, docTitle } from "./docDisplay";

/** One document: title and meta, kind chip, status badge, then Read, edit and remove. */
export default function DocumentRow({ note, project, onRead, onEdit, onRemove }) {
  const title = docTitle(note);
  const kind = docKindLabel(note.kind);
  return (
    <ListRow
      title={title}
      subtitle={docSubtitle(note, project)}
      trailing={(
        <>
          {kind ? <Badge tone="neutral" size="sm">{kind}</Badge> : null}
          <StatusBadge status={note.status} />
          <Button variant="ghost" size="sm" onClick={() => onRead(note)} aria-label={`Read ${title}`}>Read</Button>
          <IconButton icon={Pencil} label={`Edit ${title}`} onClick={() => onEdit(note)} />
          <IconButton icon={Unlink} label={`Remove ${title} from this project`} onClick={() => onRemove(note)} />
        </>
      )}
    />
  );
}

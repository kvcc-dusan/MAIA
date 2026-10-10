import React, { useMemo, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { uid } from "../../../lib/ids";
import { SectionCard } from "@/components/composed/SectionCard";
import { EmptyState } from "@/components/composed/EmptyState";
import { ConfirmDialog } from "@/components/composed/ConfirmDialog";
import { IconButton } from "@/components/composed/IconButton";
import { Button } from "@/components/arc/button/button";
import { ScrollArea } from "@/components/arc/scroll-area/scroll-area";
import LinkRow from "./library/LinkRow";
import LinkDialog from "./library/LinkDialog";
import { groupLinks, linkLabel } from "./library/linkModel";
import styles from "./library/ResourcesPanel.module.css";

/** The project's quick-access links, grouped by site type. Add and edit share one dialog. */
export default function ResourcesPanel({ project, updateProject }) {
  // false = closed, null = adding, a link = editing
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(null);

  const links = useMemo(() => project.links || [], [project.links]);
  const groups = useMemo(() => groupLinks(links), [links]);
  const writeLinks = (next) => updateProject(project.id, { links: next });

  const submit = (fields) => {
    writeLinks(editing ? links.map((l) => (l.id === editing.id ? { ...l, ...fields } : l)) : [...links, { id: uid(), ...fields }]);
    setEditing(false);
  };

  const addButton = <Button variant="secondary" onClick={() => setEditing(null)}>Add link</Button>;

  return (
    <SectionCard
      icon={Link2}
      title="Links"
      titleAs="h2"
      count={links.length}
      action={links.length > 0 && <IconButton icon={Plus} label="Add a link" onClick={() => setEditing(null)} />}
      className={styles.card}
      bodyClassName={styles.body}
    >
      {links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No links yet"
          description="Save the design files, repos and docs this project depends on."
          action={addButton}
        />
      ) : (
        <ScrollArea label="Project links" className={styles.scroll} viewportClassName={styles.viewport}>
          {groups.map((group) => (
            <section key={group.id} className={styles.group}>
              {groups.length > 1 && <h3 className={styles.groupTitle}>{group.label}</h3>}
              <ul className={styles.list}>
                {group.items.map((link) => (
                  <LinkRow key={link.id} link={link} onEdit={() => setEditing(link)} onRemove={() => setRemoving(link)} />
                ))}
              </ul>
            </section>
          ))}
        </ScrollArea>
      )}

      <LinkDialog open={editing !== false} link={editing || null} onSubmit={submit} onClose={() => setEditing(false)} />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing ? linkLabel(removing) : "link"}?`}
        description="The link is removed from this project. The page it points to is not affected."
        confirmLabel="Remove link"
        onConfirm={() => writeLinks(links.filter((l) => l.id !== removing.id))}
      />
    </SectionCard>
  );
}

import React, { useState } from "react";
import { Target, X } from "lucide-react";
import { SectionCard } from "@/components/composed/SectionCard";
import { IconButton } from "@/components/composed/IconButton";
import { Textarea } from "@/components/arc/textarea/textarea";
import { Input } from "@/components/arc/input/input";
import { Button } from "@/components/arc/button/button";
import { Checkbox } from "@/components/arc/checkbox/checkbox";
import { uid } from "../../../lib/ids";
import ProjectDetails from "./overview/ProjectDetails";
import styles from "./ProjectBrief.module.css";

/**
 * What this project is for: the directive and the success criteria, plus the
 * project details card. Milestones are edited on the Roadmap tab.
 */
export default function ProjectBrief({ project, updateProject }) {
  const [newCriteria, setNewCriteria] = useState("");
  const criteria = project.successCriteria || [];
  const writeCriteria = (next) => updateProject(project.id, { successCriteria: next });

  const addCriteria = (event) => {
    event.preventDefault();
    const text = newCriteria.trim();
    if (!text) return;
    writeCriteria([...criteria, { id: uid(), text, done: false }]);
    setNewCriteria("");
  };

  const toggleCriteria = (id) =>
    writeCriteria(criteria.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));

  return (
    <>
      <SectionCard icon={Target} titleAs="h2" title="Brief" bodyClassName={styles.body}>
        <Textarea
          label="Strategic directive"
          value={project.description || ""}
          onChange={(e) => updateProject(project.id, { description: e.target.value })}
          placeholder="Describe the objective and the outcome you want"
        />

        <div className={styles.criteria}>
          <h3 className={styles.heading}>Success criteria</h3>
          {criteria.length > 0 && (
            <ul className={styles.list}>
              {criteria.map((c) => (
                <li key={c.id} className={styles.item}>
                  <Checkbox
                    id={`criterion-${c.id}`}
                    checked={c.done}
                    aria-label={c.text}
                    onCheckedChange={() => toggleCriteria(c.id)}
                  />
                  <label htmlFor={`criterion-${c.id}`} className={c.done ? styles.done : styles.text}>{c.text}</label>
                  <IconButton
                    icon={X}
                    label={`Remove criterion "${c.text}"`}
                    onClick={() => writeCriteria(criteria.filter((x) => x.id !== c.id))}
                  />
                </li>
              ))}
            </ul>
          )}
          <form className={styles.add} onSubmit={addCriteria}>
            <Input
              label="Add a success criterion"
              value={newCriteria}
              onChange={(e) => setNewCriteria(e.target.value)}
              placeholder="What has to be true when this is done"
            />
            <Button type="submit" variant="secondary" disabled={!newCriteria.trim()}>Add criterion</Button>
          </form>
        </div>
      </SectionCard>
      <ProjectDetails project={project} updateProject={updateProject} />
    </>
  );
}

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { Input } from "@/components/arc/input/input";
import { Select } from "@/components/composed/Select";
import { SCHEDULES } from "@/lib/constants";
import { PRIORITY_OPTIONS_SHORT } from "./taskDisplay";
import styles from "./TaskComposer.module.css";

/** Quick add: title, schedule, priority. Enter submits. `note` says where the task will land. */
export default function TaskComposer({ onAdd, inputRef, note }) {
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState("today");
  const [priority, setPriority] = useState("p3");

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    onAdd({ title, schedule, priority });
    setTitle("");
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.title}>
        <Input ref={inputRef} label="New task" placeholder="What needs doing?" description={note} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <Select label="Schedule" value={schedule} onChange={setSchedule} options={SCHEDULES} />
      <Select label="Priority" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS_SHORT} />
      <div className={styles.submit}>
        <Button type="submit" disabled={!title.trim()}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" /> Add task
        </Button>
      </div>
    </form>
  );
}

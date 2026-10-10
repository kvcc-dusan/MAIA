import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { EmptyState } from "@/components/composed/EmptyState";
import { PageBar } from "../kit";
import styles from "./StubTab.module.css";

// Placeholder until the Documents page is rebuilt on the kit.
export default function DocumentsTab() {
  return (
    <div className={styles.page}>
      <PageBar action={<Button disabled>Add document</Button>} />
      <EmptyState icon={Inbox} title="Documents" description="This page is being rebuilt." />
    </div>
  );
}

import React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import { EmptyState } from "@/components/composed/EmptyState";
import { PageBar } from "../kit";
import styles from "./StubTab.module.css";

// Placeholder until the weekly report page is rebuilt; the dialog still does the work.
export default function ReportTab({ onOpenReport }) {
  return (
    <div className={styles.page}>
      <PageBar action={<Button variant="secondary" onClick={onOpenReport}>Open weekly report</Button>} />
      <EmptyState icon={FileText} title="Weekly report" description="This page is being rebuilt." />
    </div>
  );
}

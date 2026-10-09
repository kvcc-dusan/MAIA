import React from "react";
import { Kanban } from "lucide-react";
import { EmptyState } from "@/components/composed/EmptyState";

// Placeholder. Replaced by the Board tab; it receives { project, selectNote }.
export default function BoardTab() {
  return <EmptyState icon={Kanban} title="Board" description="This tab is not built yet." />;
}

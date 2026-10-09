import React from "react";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/composed/EmptyState";

// Placeholder. Replaced by the Record tab; it receives { project, selectNote }.
export default function RecordTab() {
  return <EmptyState icon={ScrollText} title="Record" description="This tab is not built yet." />;
}

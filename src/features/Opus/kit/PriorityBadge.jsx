import React from "react";
import { Badge } from "@/components/arc/badge/badge";
import { priorityLabel } from "./format";

/** p1 -> High (danger), p2 -> Medium (warning). Normal priority shows nothing, like the hub. */
export default function PriorityBadge({ priority }) {
  if (priority !== "p1" && priority !== "p2") return null;
  return <Badge tone={priority === "p1" ? "danger" : "warning"} size="sm">{priorityLabel(priority)}</Badge>;
}

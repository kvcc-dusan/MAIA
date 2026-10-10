import React from "react";
import { Badge } from "@/components/arc/badge/badge";
import { statusLabel } from "./format";

const TONES = {
  todo: "neutral",
  doing: "info",
  blocked: "danger",
  done: "success",
  open: "warning",
  answered: "success",
  draft: "neutral",
  current: "success",
  notStarted: "neutral",
  superseded: "neutral",
  planned: "neutral",
  active: "info",
  atRisk: "warning",
};

/** Status as a tinted badge. The label is always text, so colour is never the only signal. */
export default function StatusBadge({ status }) {
  const label = statusLabel(status);
  if (!label) return null;
  return <Badge tone={TONES[status] ?? "neutral"} size="sm">{label}</Badge>;
}

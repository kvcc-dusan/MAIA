// Workstream lookups for the Record rows and forms.

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const SERIES_COLORS = ["1", "2", "3", "4"];

/** A workstream color ("1" to "4") as the matching chart series token, or null. */
export const workstreamColorVar = (color) => (SERIES_COLORS.includes(String(color)) ? `var(--series-${color})` : null);

export const indexWorkstreams = (workstreams) => new Map(asList(workstreams).map((w) => [w.id, w]));

/** The workstream a row points at, or null when none is set or it no longer exists. */
export const findWorkstream = (byId, id) => (id ? byId.get(id) ?? null : null);

export const workstreamOptions = (workstreams) =>
  [...asList(workstreams)]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((w) => ({ value: w.id, label: w.name || "Untitled workstream", color: workstreamColorVar(w.color) ?? undefined }));

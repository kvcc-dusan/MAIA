// T-shirt estimates shared by the Board drawer and the Tasks editor. Pure.

export const ESTIMATE_OPTIONS = [
  { value: "S", label: "Small" },
  { value: "M", label: "Medium" },
  { value: "L", label: "Large" },
];

/** A stored estimate outside S/M/L stays selectable instead of vanishing. */
export const estimateOptionsFor = (estimate) => {
  if (estimate == null || estimate === "") return ESTIMATE_OPTIONS;
  return ESTIMATE_OPTIONS.some((o) => o.value === String(estimate))
    ? ESTIMATE_OPTIONS
    : [...ESTIMATE_OPTIONS, { value: String(estimate), label: String(estimate) }];
};

export const formatEstimate = (e) => (e == null || e === "" ? null : String(e));

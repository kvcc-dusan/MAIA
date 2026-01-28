// @maia:ids
export const uid = () => Math.random().toString(36).slice(2, 9);
export const isoNow = () => new Date().toISOString();

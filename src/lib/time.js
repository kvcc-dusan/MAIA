export const toLocalInputValue = (date) => {
  const pad = (n) => (n < 10 ? "0" + n : n);
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
};

export const checkOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();
  return s1 < e2 && s2 < e1;
};

export const hasOverlap = (start, end, sessions, excludeSessionId = null) => {
  return sessions.some(s => {
    if (excludeSessionId && s.id === excludeSessionId) return false;
    return checkOverlap(start, end, s.start, s.end);
  });
};

export const isPastTime = (date) => {
  return new Date(date) < new Date();
};

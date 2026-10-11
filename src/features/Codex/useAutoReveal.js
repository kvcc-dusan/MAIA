import { useCallback, useState } from "react";

export const AUTO_REVEAL_KEY = "maia.codex.autoReveal";

const read = () => {
  try {
    return localStorage.getItem(AUTO_REVEAL_KEY) === "true";
  } catch {
    return false;
  }
};

/** Whether the tree follows the open note. Off by default; global, not per vault. */
export const useAutoReveal = () => {
  const [isOn, setIsOn] = useState(read);

  const toggle = useCallback(() => {
    setIsOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTO_REVEAL_KEY, String(next));
      } catch {
        // Not remembered, still works for this session.
      }
      return next;
    });
  }, []);

  return [isOn, toggle];
};

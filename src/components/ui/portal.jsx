import { createPortal } from "react-dom";

export function Portal({ children }) {
  if (typeof window === "undefined") return null;
  return createPortal(children, document.body);
}

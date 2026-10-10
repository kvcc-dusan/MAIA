import { createContext, useContext, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * What a page can hand to the shell chrome. The shell owns the frame (top bar,
 * icon rail, the sidebar column); a page that wants a secondary sidebar or
 * something in the top bar renders it through a portal into these slots, so its
 * state stays in the page and the shell stays dumb.
 */
const ShellContext = createContext(null);

export const ShellProvider = ShellContext.Provider;

const useShell = () => {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("ShellSidebar and ShellTopBar must render inside MaiaShell");
  return shell;
};

/** Secondary sidebar content. Mounting it is also what makes the shell show the sidebar toggle. */
export const ShellSidebar = ({ children }) => {
  const { sidebarEl, registerSidebar } = useShell();
  useEffect(() => registerSidebar(), [registerSidebar]);
  return sidebarEl ? createPortal(children, sidebarEl) : null;
};

/** Content for the top bar's centre slot (the Codex tab strip). */
export const ShellTopBar = ({ children }) => {
  const { topBarEl } = useShell();
  return topBarEl ? createPortal(children, topBarEl) : null;
};

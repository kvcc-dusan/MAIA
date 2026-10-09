import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  Clock,
  FolderKanban,
  House,
  Network,
  Search,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/arc/app-shell/app-shell";
import { Button } from "@/components/arc/button/button";
import { ThemeSwitch } from "@/components/arc/theme-switch/theme-switch";
import { getTheme, resolveTheme, setTheme, subscribe } from "@/lib/theme";
import styles from "./MaiaShell.module.css";

const RAIL_KEY = "maia.shell.rail";

const readRail = () => {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
};

const writeRail = (collapsed) => {
  try {
    localStorage.setItem(RAIL_KEY, collapsed ? "1" : "0");
  } catch {
    // storage blocked: the choice lasts for this session only
  }
};

// Pages are routes; "chronos" and "search" are actions that open overlays.
const GROUPS = [
  {
    id: "pages",
    items: [
      { id: "home", label: "Today", icon: House },
      { id: "projects", label: "Opus", icon: FolderKanban },
      { id: "overview", label: "Codex", icon: BookOpen },
      { id: "graph", label: "Conexa", icon: Network },
      { id: "ledgerPage", label: "Ledger", icon: Wallet },
    ],
  },
  {
    id: "tools",
    items: [
      { id: "chronos", label: "Chronos", icon: Clock },
      { id: "search", label: "Search", icon: Search, badge: "⌘K" },
    ],
  },
];

const PAGE_TITLES = {
  home: "Today",
  projects: "Opus",
  overview: "Codex",
  graph: "Conexa",
  ledgerPage: "Ledger",
  editor: "Note",
};

// The editor has no nav item of its own: it lives under Codex.
const NAV_FOR_PAGE = { editor: "overview" };

const ThemeFooter = ({ rail }) => {
  const mode = useSyncExternalStore(subscribe, getTheme, () => "system");
  const resolved = resolveTheme(mode);

  return (
    <div className={styles.footer} data-rail={rail || undefined}>
      <ThemeSwitch
        theme={resolved}
        iconOnly={rail}
        label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
        onThemeChange={(next) => setTheme(next)}
      />
      {!rail && (
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={mode === "system"}
          onClick={() => setTheme("system")}
        >
          {mode === "system" ? "Following system" : "Follow system"}
        </Button>
      )}
    </div>
  );
};

const Brand = ({ rail }) => (
  <span aria-label="MAIA">{rail ? "M" : "MAIA"}</span>
);

/**
 * App chrome: Arc's sidebar shell in place of the floating dock.
 * Navigation state stays in App; this only maps nav ids to callbacks.
 */
export const MaiaShell = ({
  currentPage,
  onNavigate,
  onOpenChronos,
  onToggleSearch,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(readRail);

  const handleCollapsedChange = useCallback((next) => {
    setCollapsed(next);
    writeRail(next);
  }, []);

  const handleNavigate = useCallback(
    (id) => {
      if (id === "chronos") onOpenChronos();
      else if (id === "search") onToggleSearch();
      else onNavigate(id);
    },
    [onNavigate, onOpenChronos, onToggleSearch]
  );

  // An open modal doesn't take over the highlight: the page underneath stays
  // the active destination.
  const activeId = useMemo(
    () => NAV_FOR_PAGE[currentPage] ?? currentPage,
    [currentPage]
  );

  return (
    <div className={styles.frame}>
      <AppShell
        brand={Brand}
        groups={GROUPS}
        activeId={activeId}
        onNavigate={handleNavigate}
        title={PAGE_TITLES[currentPage] ?? "MAIA"}
        footer={ThemeFooter}
        collapsed={collapsed}
        onCollapsedChange={handleCollapsedChange}
      >
        {children}
      </AppShell>
    </div>
  );
};

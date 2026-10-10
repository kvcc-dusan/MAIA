import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  FolderKanban,
  Monitor,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  Wallet,
} from "lucide-react";
import { IconButton } from "@/components/composed/IconButton";
import { getTheme, resolveTheme, setTheme, subscribe } from "@/lib/theme";
import { isTauri } from "@/lib/vault";
import { RailButton } from "./RailButton";
import { ShellProvider } from "./ShellContext";
import styles from "./MaiaShell.module.css";

const SIDEBAR_KEY = "maia.shell.sidebar";
const NARROW_QUERY = "(max-width: 720px)";

const readSidebarOpen = () => {
  try {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored !== null) return stored === "1";
  } catch {
    // storage blocked: fall through to the default
  }
  // On a narrow window the sidebar would cover the page, so it starts closed.
  return !(typeof window !== "undefined" && window.matchMedia?.(NARROW_QUERY).matches);
};

const writeSidebarOpen = (open) => {
  try {
    localStorage.setItem(SIDEBAR_KEY, open ? "1" : "0");
  } catch {
    // storage blocked: the choice lasts for this session only
  }
};

// Pages are routes; "chronos" and "search" are actions that open overlays.
const PAGES = [
  { id: "projects", label: "Opus", icon: FolderKanban },
  { id: "codex", label: "Codex", icon: BookOpen },
  { id: "graph", label: "Conexa", icon: Network },
  { id: "ledgerPage", label: "Ledger", icon: Wallet },
];

const PAGE_TITLES = {
  projects: "Opus",
  codex: "Codex",
  graph: "Conexa",
  ledgerPage: "Ledger",
};

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon };
const THEME_ORDER = ["light", "dark", "system"];

// macOS draws its traffic lights over our top bar when the title bar is an overlay.
const hasTrafficLights = () =>
  isTauri() && typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

const ThemeButton = () => {
  const mode = useSyncExternalStore(subscribe, getTheme, () => "system");
  const next = THEME_ORDER[(THEME_ORDER.indexOf(mode) + 1) % THEME_ORDER.length];
  return (
    <RailButton
      icon={THEME_ICONS[mode]}
      label={`Theme: ${mode}`}
      hint={`Theme: ${mode} (showing ${resolveTheme(mode)}). Switch to ${next}`}
      onClick={() => setTheme(next)}
    />
  );
};

/**
 * App chrome, laid out like Obsidian: a top bar across the whole window (traffic
 * lights, sidebar toggle, back and forward, then the page's own strip), a slim
 * icon rail, an optional secondary sidebar a page fills through ShellSidebar,
 * and the page itself. Navigation state stays in App.
 */
export const MaiaShell = ({
  currentPage,
  onNavigate,
  onOpenChronos,
  onToggleSearch,
  history,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const [sidebarEl, setSidebarEl] = useState(null);
  const [topBarEl, setTopBarEl] = useState(null);
  const [sidebarCount, setSidebarCount] = useState(0);
  const hasSidebar = sidebarCount > 0;

  const registerSidebar = useCallback(() => {
    setSidebarCount((n) => n + 1);
    return () => setSidebarCount((n) => n - 1);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => {
      writeSidebarOpen(!open);
      return !open;
    });
  }, []);

  const shell = useMemo(
    () => ({ sidebarEl, topBarEl, registerSidebar }),
    [sidebarEl, topBarEl, registerSidebar]
  );

  const title = PAGE_TITLES[currentPage] ?? "MAIA";
  const showSidebar = hasSidebar && sidebarOpen;
  const ToggleIcon = sidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <ShellProvider value={shell}>
      <div className={styles.frame} data-lights={hasTrafficLights() || undefined}>
        <header className={styles.topBar} data-tauri-drag-region>
          <div className={styles.lights} data-tauri-drag-region aria-hidden="true" />
          <div className={styles.controls}>
            {hasSidebar && (
              <IconButton
                icon={ToggleIcon}
                label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                aria-expanded={sidebarOpen}
                side="bottom"
                onClick={toggleSidebar}
              />
            )}
            <IconButton
              icon={ArrowLeft}
              label="Back"
              side="bottom"
              disabled={!history.canBack}
              onClick={history.back}
            />
            <IconButton
              icon={ArrowRight}
              label="Forward"
              side="bottom"
              disabled={!history.canForward}
              onClick={history.forward}
            />
          </div>
          <div className={styles.topBarSlot} ref={setTopBarEl} data-tauri-drag-region />
          {currentPage !== "codex" && (
            <span className={styles.pageTitle} data-tauri-drag-region>
              {title}
            </span>
          )}
        </header>

        <div className={styles.body}>
          <nav className={styles.rail} aria-label="Primary">
            <div className={styles.railGroup}>
              {PAGES.map(({ id, label, icon }) => (
                <RailButton
                  key={id}
                  icon={icon}
                  label={label}
                  active={currentPage === id}
                  onClick={() => onNavigate(id)}
                />
              ))}
            </div>
            <div className={styles.railGroup} data-divided>
              <RailButton icon={Clock} label="Chronos" onClick={onOpenChronos} />
              <RailButton
                icon={Search}
                label="Search"
                hint="Search ⌘K"
                shortcut="Meta+K Control+K"
                onClick={onToggleSearch}
              />
            </div>
            <div className={styles.railFooter}>
              <ThemeButton />
            </div>
          </nav>

          <aside
            className={styles.sidebar}
            data-open={showSidebar || undefined}
            aria-label="Sidebar"
            inert={showSidebar ? undefined : true}
          >
            <div className={styles.sidebarInner} ref={setSidebarEl} />
          </aside>

          <main className={styles.content}>
            <h1 className="sr-only">{title}</h1>
            {children}
          </main>
        </div>
      </div>
    </ShellProvider>
  );
};

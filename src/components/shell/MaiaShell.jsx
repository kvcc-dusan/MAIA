import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  FolderKanban,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
} from "lucide-react";
import { IconButton } from "@/components/composed/IconButton";
import { isTauri } from "@/lib/vault";
import { RailButton } from "./RailButton";
import { ShellProvider } from "./ShellContext";
import { VaultMenu } from "./VaultMenu";
import styles from "./MaiaShell.module.css";

const SIDEBAR_KEY = "maia.shell.sidebar";
const MAIN_ID = "maia-main";
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
];

const PAGE_TITLES = {
  projects: "Opus",
  codex: "Codex",
  graph: "Conexa",
};

// macOS draws its traffic lights over our top bar when the title bar is an overlay.
const hasTrafficLights = () =>
  isTauri() && typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

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
  onOpenSettings,
  onOpenVaultSettings,
  history,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const [sidebarEl, setSidebarEl] = useState(null);
  const [topBarEl, setTopBarEl] = useState(null);
  const [sidebarCount, setSidebarCount] = useState(0);
  const hasSidebar = sidebarCount > 0;
  const mainRef = useRef(null);

  // A hash link would rewrite the URL (base path /MAIA/, no router), so move focus by hand.
  const skipToMain = (event) => {
    event.preventDefault();
    mainRef.current?.focus();
  };

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
        <a className={styles.skipLink} href={`#${MAIN_ID}`} onClick={skipToMain}>
          Skip to content
        </a>
        <header className={styles.topBar} data-tauri-drag-region>
          <div className={styles.lights} data-tauri-drag-region aria-hidden="true" />
          <div className={styles.controls}>
            {hasSidebar && (
              <IconButton
                icon={ToggleIcon}
                label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
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
              <RailButton
                icon={Settings}
                label="Settings"
                hint="Settings ⌘,"
                shortcut="Meta+, Control+,"
                onClick={onOpenSettings}
              />
              <VaultMenu onOpenVaultSettings={onOpenVaultSettings} />
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

          <main id={MAIN_ID} ref={mainRef} tabIndex={-1} className={styles.content}>
            <h1 className="sr-only">{title}</h1>
            {children}
          </main>
        </div>
      </div>
    </ShellProvider>
  );
};

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "@/components/icons";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./app-shell.module.css";
const renderSlot = (slot, state) => typeof slot === "function" ? slot(state) : slot;
const FULL_WIDTH = 248;
const RAIL_WIDTH = 68;
const MOBILE_QUERY = "(max-width: 767px)";
const FOCUSABLE = "a[href], button:not(:disabled), [tabindex]:not([tabindex='-1'])";
const subscribeMobile = (notify) => {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const useIsMobile = () => useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
export function AppShell({ brand, groups, activeId, onNavigate, title, actions, footer, collapsed, defaultCollapsed = false, onCollapsedChange, navLabel = "Main", children }) {
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const rail = !isMobile && (collapsed ?? internalCollapsed);
  const sidebar = useRef(null);
  const menuButton = useRef(null);
  const uid = useId();
  const mainId = `${uid}-main`;
  const drawerHidden = isMobile && !drawerOpen;
  useEffect(() => {
    if (sidebar.current) sidebar.current.inert = drawerHidden;
  }, [drawerHidden]);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButton.current?.focus();
  }, []);
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);
  useEffect(() => {
    if (drawerOpen) sidebar.current?.querySelector("[aria-current='page'], a[href], button")?.focus();
  }, [drawerOpen]);
  const toggleCollapsed = () => {
    const next = !rail;
    if (collapsed === void 0) setInternalCollapsed(next);
    onCollapsedChange?.(next);
  };
  const onSidebarKeyDown = (event) => {
    if (!drawerOpen) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      closeDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...event.currentTarget.querySelectorAll(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const navigate = (id) => {
    onNavigate?.(id);
    if (isMobile) closeDrawer();
  };
  const width = isMobile ? FULL_WIDTH : rail ? RAIL_WIDTH : FULL_WIDTH;
  return <div className={styles.shell} data-rail={rail || void 0}>
    <a className={styles.skip} href={`#${mainId}`}>Skip to content</a>
    {isMobile && drawerOpen ? <div className={styles.backdrop} onClick={closeDrawer} aria-hidden="true" /> : null}
    <motion.aside
    ref={sidebar}
    className={styles.sidebar}
    data-drawer={isMobile || void 0}
    data-open={drawerOpen || void 0}
    initial={false}
    animate={{ width }}
    transition={reduceMotion ? { duration: 0 } : motionTokens.spring.smooth}
    onKeyDown={onSidebarKeyDown}
  >
      <div className={styles.brand}>{renderSlot(brand, { rail })}</div>
      <nav className={styles.nav} aria-label={navLabel}>
        <LayoutGroup id={`${uid}-nav`}>
          {groups.map((group) => <div key={group.id} className={styles.group}>
            {group.label ? <p className={styles.groupLabel} data-hidden={rail || void 0}>{group.label}</p> : null}
            <ul className={styles.list}>
              {group.items.map((item) => {
    const Icon = item.icon;
    const active = item.id === activeId;
    const content = <>
                  {active ? <motion.span layoutId="app-shell-active" className={styles.indicator} transition={reduceMotion ? { duration: 0 } : motionTokens.spring.morph} /> : null}
                  <Icon className={styles.icon} size={20} strokeWidth={1.75} aria-hidden="true" />
                  <span className={styles.label}>{item.label}</span>
                  {item.badge !== void 0 ? <span className={styles.badge}>{item.badge}</span> : null}
                </>;
    const shared = { className: styles.item, "data-active": active || void 0, "data-tip": rail ? item.label : void 0, "aria-current": active ? "page" : void 0, "aria-label": rail ? item.label : void 0 };
    return <li key={item.id}>
                  {item.href ? <a {...shared} href={item.href} onClick={() => navigate(item.id)}>{content}</a> : <button {...shared} type="button" onClick={() => navigate(item.id)}>{content}</button>}
                </li>;
  })}
            </ul>
          </div>)}
        </LayoutGroup>
      </nav>
      {footer ? <div className={styles.footer}>{renderSlot(footer, { rail })}</div> : null}
    </motion.aside>
    <div className={styles.column}>
      <header className={styles.topbar}>
        {isMobile ? <button ref={menuButton} type="button" className={styles.iconButton} onClick={() => setDrawerOpen(true)} aria-label="Open navigation" aria-expanded={drawerOpen}><Menu size={20} strokeWidth={1.75} aria-hidden="true" /></button> : <button type="button" className={styles.iconButton} onClick={toggleCollapsed} aria-label={rail ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!rail}>{rail ? <PanelLeftOpen size={20} strokeWidth={1.75} aria-hidden="true" /> : <PanelLeftClose size={20} strokeWidth={1.75} aria-hidden="true" />}</button>}
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.actions}>{actions}</div>
      </header>
      <main id={mainId} className={styles.main} tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
export default AppShell;

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronDownIcon, CogIcon, MenuIcon } from "./icons.js";

interface SiteMenuLink {
  label: string;
  icon: ReactNode;
  href: string;
  isCurrent?: boolean;
}

interface SiteMenuAction {
  label: string;
  icon: ReactNode;
  onChoose: () => void;
}

export type SiteMenuEntry = SiteMenuLink | SiteMenuAction;

export const settingsView = "settings";

const headerHeightProperty = "--site-header-height";

interface SiteHeaderProps {
  brandHref: string;
  subtitle?: string;
  menuLabel: string;
  menuEntries: readonly SiteMenuEntry[];
  isSettingsOpen: boolean;
  hasSidebar?: boolean;
}

const listMenuItems = (menu: HTMLElement | null): HTMLElement[] =>
  menu === null
    ? []
    : [
        ...menu.querySelectorAll(".site-menu-list a, .site-menu-list button"),
      ].filter((item) => item instanceof HTMLElement);

const focusMenuItem = (menu: HTMLElement | null, step: number | "first") => {
  const items = listMenuItems(menu);
  if (items.length === 0) {
    return;
  }
  const focusedIndex = items.findIndex(
    (item) => item === document.activeElement,
  );
  const nextIndex =
    step === "first" || focusedIndex === -1
      ? 0
      : (focusedIndex + step + items.length) % items.length;
  items[nextIndex]?.focus();
};

export const SiteHeader = ({
  brandHref,
  subtitle,
  menuLabel,
  menuEntries,
  isSettingsOpen,
  hasSidebar = false,
}: SiteHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isFirstItemFocusWantedRef = useRef(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    const header = headerRef.current;
    if (header === null) {
      return;
    }
    const rootStyle = document.documentElement.style;
    const observer = new ResizeObserver(() => {
      rootStyle.setProperty(
        headerHeightProperty,
        `${String(header.offsetHeight)}px`,
      );
    });
    observer.observe(header);
    return () => {
      observer.disconnect();
      rootStyle.removeProperty(headerHeightProperty);
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const closeMenuOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        menuRef.current?.contains(event.target) !== true
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeMenuOnOutsidePointer);
    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsidePointer);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen && isFirstItemFocusWantedRef.current) {
      isFirstItemFocusWantedRef.current = false;
      focusMenuItem(menuRef.current, "first");
    }
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const moveThroughMenu = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && isMenuOpen) {
      event.preventDefault();
      closeMenu();
      toggleRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    if (!isMenuOpen) {
      isFirstItemFocusWantedRef.current = true;
      setIsMenuOpen(true);
      return;
    }
    focusMenuItem(menuRef.current, event.key === "ArrowDown" ? 1 : -1);
  };

  return (
    <header
      ref={headerRef}
      className={hasSidebar ? "site-header has-sidebar" : "site-header"}
    >
      <a className="site-header-brand" href={brandHref}>
        <img src="/favicon.svg" alt="" width="36" height="36" />
        <span className="site-header-titles">
          <span className="site-header-title">Wizzaroo</span>
          {subtitle === undefined ? null : (
            <span className="site-header-subtitle">{subtitle}</span>
          )}
        </span>
      </a>
      <nav
        ref={menuRef}
        className="site-menu"
        aria-label={menuLabel}
        onKeyDown={moveThroughMenu}
        onBlur={(event) => {
          if (
            event.relatedTarget instanceof Node &&
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            closeMenu();
          }
        }}
      >
        <button
          ref={toggleRef}
          type="button"
          className="site-menu-toggle"
          aria-expanded={isMenuOpen}
          aria-controls={isMenuOpen ? menuId : undefined}
          onClick={() => {
            setIsMenuOpen((isOpen) => !isOpen);
          }}
        >
          <MenuIcon />
          <span>Menu</span>
          <span className="site-menu-chevron">
            <ChevronDownIcon />
          </span>
        </button>
        {isMenuOpen ? (
          <ul id={menuId} className="site-menu-list">
            {menuEntries.map((entry) =>
              "href" in entry ? (
                <li key={entry.label}>
                  <a
                    href={entry.href}
                    aria-current={entry.isCurrent === true ? "page" : undefined}
                    onClick={closeMenu}
                  >
                    {entry.icon}
                    {entry.label}
                  </a>
                </li>
              ) : (
                <li key={entry.label} className="site-menu-action">
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      entry.onChoose();
                    }}
                  >
                    {entry.icon}
                    {entry.label}
                  </button>
                </li>
              ),
            )}
          </ul>
        ) : null}
      </nav>
      <a
        className="site-header-settings"
        href={`#${settingsView}`}
        aria-label="Settings"
        title="Settings"
        aria-current={isSettingsOpen ? "page" : undefined}
      >
        <CogIcon />
      </a>
    </header>
  );
};

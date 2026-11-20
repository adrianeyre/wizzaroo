import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  MenuIcon,
} from "../site-header/icons.js";

export type PlayMenuGroup = "panels" | "pages" | "finish";

export interface PlayMenuOption {
  label: string;
  hint: string;
  icon: ReactNode;
  group: PlayMenuGroup;
  sidePanel?: { id: string; isOpen: boolean };
  onChoose: () => void;
}

type FocusTarget = "first" | "last";

const listMenuItems = (menu: HTMLElement | null): HTMLElement[] =>
  menu === null
    ? []
    : [...menu.querySelectorAll('[role="menuitem"]')].filter(
        (item) => item instanceof HTMLElement,
      );

const findTypedItemIndex = (
  items: readonly HTMLElement[],
  typed: string,
  fromIndex: number,
): number => {
  const startsWithTyped = (index: number) =>
    (items[index]?.dataset.label ?? "").toLowerCase().startsWith(typed);
  const after = items.findIndex(
    (_item, index) => index > fromIndex && startsWithTyped(index),
  );
  return after === -1
    ? items.findIndex((_item, index) => startsWithTyped(index))
    : after;
};

// The World Map's drop-down Menu, at the far right of the top bar, built to
// the WAI-ARIA menu button pattern: the arrow keys, Home, End and a typed
// first letter move through it, Escape closes it back onto its button, and
// Tab closes it and moves on.
export const PlayMenu = ({
  options,
  toggleRef,
}: {
  options: readonly PlayMenuOption[];
  toggleRef: RefObject<HTMLButtonElement | null>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const focusOnOpenRef = useRef<FocusTarget>("first");
  const menuRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const items = listMenuItems(menuRef.current);
    (focusOnOpenRef.current === "first" ? items[0] : items.at(-1))?.focus();
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        menuRef.current?.contains(event.target) !== true
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [isOpen]);

  const openMenu = (focusTarget: FocusTarget) => {
    focusOnOpenRef.current = focusTarget;
    setIsOpen(true);
  };

  const closeMenu = ({ isFocusReturned }: { isFocusReturned: boolean }) => {
    setIsOpen(false);
    if (isFocusReturned) {
      toggleRef.current?.focus();
    }
  };

  const moveFromToggle = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(event.key === "ArrowDown" ? "first" : "last");
    }
  };

  const moveThroughItems = (event: KeyboardEvent<HTMLUListElement>) => {
    const items = listMenuItems(menuRef.current);
    const focusedIndex = items.findIndex(
      (item) => item === document.activeElement,
    );
    const focusItem = (index: number) => {
      event.preventDefault();
      items[(index + items.length) % items.length]?.focus();
    };
    switch (event.key) {
      case "ArrowDown":
        focusItem(focusedIndex + 1);
        return;
      case "ArrowUp":
        focusItem(focusedIndex - 1);
        return;
      case "Home":
        focusItem(0);
        return;
      case "End":
        focusItem(items.length - 1);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeMenu({ isFocusReturned: true });
        return;
      case "Tab":
        closeMenu({ isFocusReturned: false });
        return;
    }
    if (
      event.key.length === 1 &&
      /\S/u.test(event.key) &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      const typedIndex = findTypedItemIndex(
        items,
        event.key.toLowerCase(),
        focusedIndex,
      );
      if (typedIndex !== -1) {
        focusItem(typedIndex);
      }
    }
  };

  return (
    <div
      ref={menuRef}
      className="play-menu"
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setIsOpen(false);
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        className="play-menu-toggle"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        onKeyDown={moveFromToggle}
        onClick={() => {
          if (isOpen) {
            closeMenu({ isFocusReturned: false });
            return;
          }
          openMenu("first");
        }}
      >
        <MenuIcon />
        <span className="play-menu-label">Menu</span>
        <span className="play-menu-chevron">
          <ChevronDownIcon />
        </span>
      </button>
      {isOpen ? (
        <ul
          id={listId}
          role="menu"
          aria-label="Menu"
          className="play-menu-list"
          onKeyDown={moveThroughItems}
        >
          {options.map((option, index) => {
            const labelId = `${baseId}-label-${String(index)}`;
            const hintId = `${baseId}-hint-${String(index)}`;
            const isNewGroup =
              index > 0 && options[index - 1]?.group !== option.group;
            return (
              <Fragment key={option.label}>
                {isNewGroup ? (
                  <li role="separator" className="play-menu-separator" />
                ) : null}
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className={`play-menu-item ${option.group}`}
                    data-label={option.label}
                    aria-labelledby={labelId}
                    aria-describedby={hintId}
                    aria-expanded={option.sidePanel?.isOpen}
                    aria-controls={
                      option.sidePanel?.isOpen === true
                        ? option.sidePanel.id
                        : undefined
                    }
                    onClick={() => {
                      setIsOpen(false);
                      option.onChoose();
                    }}
                  >
                    <span className="play-menu-item-icon">{option.icon}</span>
                    <span className="play-menu-item-text">
                      <span id={labelId} className="play-menu-item-label">
                        {option.label}
                      </span>
                      <span id={hintId} className="play-menu-item-hint">
                        {option.hint}
                      </span>
                    </span>
                    {option.sidePanel === undefined ? null : (
                      <span className="play-menu-item-more">
                        <ChevronRightIcon />
                      </span>
                    )}
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

interface PlaySidePanelProps {
  id: string;
  title: string;
  returnFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}

const findPanelStartItem = (panel: HTMLElement): HTMLElement | null =>
  panel.querySelector<HTMLElement>(
    '.play-side-panel-list button:is([aria-pressed="true"], [aria-current="page"]):not(:disabled)',
  ) ??
  panel.querySelector<HTMLElement>(
    ".play-side-panel-list button:not(:disabled)",
  );

// A panel down the right of the World Map, opened from the Menu. Opening it
// moves focus to its chosen (or first) item; closing it, with its ✕ or
// Escape, puts focus back on the Menu button.
export const PlaySidePanel = ({
  id,
  title,
  returnFocusRef,
  onClose,
  children,
}: PlaySidePanelProps) => {
  const panelRef = useRef<HTMLElement>(null);
  const headingId = useId();

  useEffect(() => {
    const panel = panelRef.current;
    if (panel === null) {
      return;
    }
    findPanelStartItem(panel)?.focus();
    const returnFocus = returnFocusRef.current;
    return () => {
      const focused = document.activeElement;
      if (
        focused === null ||
        focused === document.body ||
        panel.contains(focused)
      ) {
        returnFocus?.focus();
      }
    };
  }, [returnFocusRef]);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        document.querySelector("dialog[open]") !== null
      ) {
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <section
      ref={panelRef}
      id={id}
      className="play-side-panel"
      aria-labelledby={headingId}
    >
      <header className="play-side-panel-header">
        <h2 id={headingId}>{title}</h2>
        <button
          type="button"
          className="panel-close"
          aria-label={`Close ${title}`}
          title={`Close ${title}`}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </header>
      <ul className="play-side-panel-list">{children}</ul>
    </section>
  );
};

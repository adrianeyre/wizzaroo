import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  loadPopupPosition,
  storePopupPosition,
  type PopupOffset,
} from "./popup-positions.js";
import { ReadAloudButton } from "./read-aloud-button.js";

const nudgePixels = 24;
const keptOnScreenPixels = 64;

const popupNudges: Partial<Record<string, PopupOffset>> = {
  ArrowLeft: { x: -nudgePixels, y: 0 },
  ArrowRight: { x: nudgePixels, y: 0 },
  ArrowUp: { x: 0, y: -nudgePixels },
  ArrowDown: { x: 0, y: nudgePixels },
};

export const movePopupLabel = "Move this box: drag it, or use the arrow keys";

export const keepPopupOnScreen = (
  offset: PopupOffset,
  restingBox: { left: number; top: number; width: number; height: number },
  screen: { width: number; height: number },
): PopupOffset => ({
  x: Math.min(
    Math.max(0, screen.width - restingBox.left - keptOnScreenPixels),
    Math.max(
      Math.min(0, keptOnScreenPixels - restingBox.left - restingBox.width),
      offset.x,
    ),
  ),
  y: Math.min(
    Math.max(0, screen.height - restingBox.top - keptOnScreenPixels),
    Math.max(Math.min(0, -restingBox.top), offset.y),
  ),
});

const isControl = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest("button, a, input, select, textarea, label") !== null;

const findRestingBox = (popup: Element, offset: PopupOffset) => {
  const box = popup.getBoundingClientRect();
  return {
    left: box.left - offset.x,
    top: box.top - offset.y,
    width: box.width,
    height: box.height,
  };
};

const findScreen = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const MoveGripIcon = () => (
  <svg
    className="line-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M5 9h14" />
    <path d="M5 15h14" />
  </svg>
);

const restingOffset: PopupOffset = { x: 0, y: 0 };

export const MovablePopup = ({
  positionKey,
  className,
  style,
  children,
  isReadAloud = true,
  ...sectionProps
}: ComponentPropsWithoutRef<"section"> & {
  positionKey: string;
  /** Whether it has a button that reads its words out loud; on by default. */
  isReadAloud?: boolean;
}) => {
  const popupRef = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState<PopupOffset>(
    () => loadPopupPosition(positionKey) ?? restingOffset,
  );

  useLayoutEffect(() => {
    const popup = popupRef.current;
    if (popup === null) {
      return;
    }
    setOffset((stored) =>
      keepPopupOnScreen(stored, findRestingBox(popup, stored), findScreen()),
    );
  }, []);

  const moveTo = (moved: PopupOffset) => {
    setOffset(moved);
    storePopupPosition(positionKey, moved);
  };

  const startDragging = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || isControl(event.target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const popup = event.currentTarget;
    const restingBox = findRestingBox(popup, offset);
    const grabbedAt = {
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    };
    let dragged = offset;
    const followPointer = (moved: PointerEvent) => {
      dragged = keepPopupOnScreen(
        { x: moved.clientX - grabbedAt.x, y: moved.clientY - grabbedAt.y },
        restingBox,
        findScreen(),
      );
      setOffset(dragged);
    };
    const stopDragging = () => {
      window.removeEventListener("pointermove", followPointer);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      moveTo(dragged);
    };
    window.addEventListener("pointermove", followPointer);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  };

  const nudgePopup = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const nudge = popupNudges[event.key];
    const popup = event.currentTarget.closest("section");
    if (nudge === undefined || popup === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    moveTo(
      keepPopupOnScreen(
        { x: offset.x + nudge.x, y: offset.y + nudge.y },
        findRestingBox(popup, offset),
        findScreen(),
      ),
    );
  };

  return (
    <section
      {...sectionProps}
      ref={popupRef}
      className={`${className ?? ""} movable-popup`.trim()}
      style={{
        ...style,
        translate: `${String(offset.x)}px ${String(offset.y)}px`,
      }}
      onPointerDown={startDragging}
    >
      <button
        type="button"
        className="popup-move"
        aria-label={movePopupLabel}
        onKeyDown={nudgePopup}
      >
        <MoveGripIcon />
      </button>
      {children}
      {isReadAloud ? (
        <ReadAloudButton className="read-aloud popup-read-aloud" readsSection />
      ) : null}
    </section>
  );
};

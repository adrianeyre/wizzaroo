const messageSelector = '[role="status"], [role="alert"]';
const headingSelector = "h1, h2, h3, h4";
const focusableSelector =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

const isStillFocusable = (element: HTMLElement): boolean =>
  element.isConnected && !element.matches(":disabled");

const listAncestors = (element: HTMLElement): HTMLElement[] => {
  const ancestors: HTMLElement[] = [];
  for (
    let ancestor = element.parentElement;
    ancestor !== null;
    ancestor = ancestor.parentElement
  ) {
    ancestors.push(ancestor);
  }
  return ancestors;
};

const hasText = (element: Element) => element.textContent.trim() !== "";

const findFirstMatch = (
  elements: readonly Element[],
  selector: string,
): HTMLElement | undefined =>
  elements
    .flatMap((element) => [
      ...(element.matches(selector) ? [element] : []),
      ...element.querySelectorAll(selector),
    ])
    .find(
      (match): match is HTMLElement =>
        match instanceof HTMLElement &&
        (selector !== messageSelector || hasText(match)),
    );

const findRecoveryTarget = (
  container: HTMLElement,
  addedElements: readonly Element[],
): HTMLElement | undefined => {
  const addedInContainer = addedElements.filter(
    (element) => element.isConnected && container.contains(element),
  );
  return (
    findFirstMatch(addedInContainer, messageSelector) ??
    findFirstMatch(addedInContainer, headingSelector) ??
    findFirstMatch(addedInContainer, focusableSelector) ??
    findFirstMatch([container], focusableSelector) ??
    findFirstMatch([container], headingSelector)
  );
};

const focusRecoveryTarget = (target: HTMLElement) => {
  if (!target.matches(focusableSelector)) {
    target.tabIndex = -1;
  }
  target.focus();
};

export const startFocusRecovery = (root: HTMLElement): (() => void) => {
  let lastFocused: HTMLElement | undefined;
  let lastFocusedAncestors: HTMLElement[] = [];

  const rememberFocus = (event: FocusEvent) => {
    if (event.target instanceof HTMLElement && root.contains(event.target)) {
      lastFocused = event.target;
      lastFocusedAncestors = listAncestors(event.target);
    }
  };

  const recoverLostFocus = (mutations: MutationRecord[]) => {
    const hasLostFocus =
      lastFocused !== undefined &&
      !isStillFocusable(lastFocused) &&
      (document.activeElement === null ||
        document.activeElement === document.body);
    if (!hasLostFocus) {
      return;
    }
    const container = lastFocusedAncestors.find(
      (ancestor) => ancestor.isConnected && root.contains(ancestor),
    );
    if (container === undefined) {
      return;
    }
    const addedElements = mutations.flatMap(({ addedNodes }) =>
      [...addedNodes].filter((node) => node instanceof Element),
    );
    const target = findRecoveryTarget(container, addedElements);
    if (target !== undefined) {
      focusRecoveryTarget(target);
    }
  };

  const observer = new MutationObserver(recoverLostFocus);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled"],
  });
  document.addEventListener("focusin", rememberFocus);

  return () => {
    observer.disconnect();
    document.removeEventListener("focusin", rememberFocus);
  };
};

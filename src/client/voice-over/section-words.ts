/**
 * The words of a section of a page, as a Child would hear them read: its
 * headings, paragraphs and list items in order, leaving out its buttons,
 * form fields and anything hidden from a screen reader.
 */

export const readAloudSectionSelector =
  "[data-read-aloud-section], dialog, [role=dialog], section, article";

const skippedSelector = [
  "button",
  "input",
  "select",
  "textarea",
  "nav",
  "table",
  "svg",
  "canvas",
  "[aria-hidden=true]",
  "[hidden]",
  "[data-read-aloud-skip]",
].join(", ");

const blockSelector =
  "h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, dt, dd, label";

const isSkipped = (element: Element, section: Element): boolean => {
  const skipped = element.closest(skippedSelector);
  return skipped !== null && section.contains(skipped) && skipped !== section;
};

const readText = (element: Element, section: Element): string =>
  [...element.childNodes]
    .map((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent ?? "";
      }
      return node instanceof Element && !isSkipped(node, section)
        ? readText(node, section)
        : "";
    })
    .join("")
    .replaceAll(/\s+/g, " ")
    .trim();

export const listSectionWords = (section: Element): string => {
  const blocks = [...section.querySelectorAll(blockSelector)].filter(
    (block) => {
      const outerBlock = block.parentElement?.closest(blockSelector);
      return (
        !isSkipped(block, section) &&
        (outerBlock === null ||
          outerBlock === undefined ||
          !section.contains(outerBlock))
      );
    },
  );
  const lines =
    blocks.length === 0
      ? [readText(section, section)]
      : blocks.map((block) => readText(block, section));
  return lines.filter((line) => line !== "").join("\n");
};

/** The section a read-aloud button reads: its nearest, or else its parent. */
export const findReadAloudSection = (button: Element): Element | undefined =>
  button.parentElement?.closest(readAloudSectionSelector) ??
  button.parentElement ??
  undefined;

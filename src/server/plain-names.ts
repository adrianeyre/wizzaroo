export class NameNotPlainError extends Error {
  override readonly name = "NameNotPlainError";
  readonly statusCode = 400;

  constructor() {
    super("A name can't hold a line break, a link or a control character");
  }
}

/**
 * Every control character (line breaks and tabs included), every format character (the bidirectional controls among
 * them) and the Unicode line and paragraph separators. The zero-width joiner and non-joiner are left out: some names
 * can't be spelled without them, and they neither break a line nor turn text around.
 */
const notPlainCharacters = /[\p{Cc}\p{Zl}\p{Zp}]|(?![\u200C\u200D])\p{Cf}/u;

const joiners = /[\u200C\u200D]/gu;

/** A URL scheme such as `https://`, or a web address starting `www.`. */
const linkShape = /[a-z][a-z\d+.-]*:\/\/|www\./iu;

/**
 * A name, as staff or a Parent types it, reaches other people's emails, so it must be a name and nothing more: one line
 * of plain text with no link in it (#321).
 */
export const isPlainName = (name: string): boolean =>
  !notPlainCharacters.test(name) &&
  !linkShape.test(name.normalize("NFKC").replaceAll(joiners, ""));

const formatCharacters = /(?![\u200C\u200D])\p{Cf}/gu;
const breaksAndSpaces = /[\s\p{Cc}\p{Zl}\p{Zp}]+/gu;

/**
 * A stored name reduced to one plain line for an email: format characters other than the joiners gone, and every run of line breaks, controls
 * and spaces made one space, so a name stored before #321 still can't make a paragraph of its own or turn text around.
 */
export const toOneLine = (name: string): string =>
  name.replaceAll(formatCharacters, "").replaceAll(breaksAndSpaces, " ").trim();

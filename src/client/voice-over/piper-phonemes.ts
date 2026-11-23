/**
 * Splits eSpeak NG's phonemes into the symbols a Piper voice knows, as Piper
 * itself does (ADR 0074): one symbol a code point, after Unicode NFD, so an
 * accent mark is a symbol of its own; and, for the voices made with Piper
 * 1.5, such as Alba and VCTK, each vowel pair the voice lists in its
 * `vowel_clusters` joined back into one symbol, such as "aɪ".
 */
export const splitPhonemes = (
  phonemes: string,
  vowelClusters: readonly (readonly string[])[] = [],
): string[] => {
  const symbols = Array.from(phonemes.normalize("NFD"));
  if (vowelClusters.length === 0) {
    return symbols;
  }
  const clusters = new Set(
    vowelClusters.map((cluster) => cluster.join("\u0000")),
  );
  const longest = Math.max(...vowelClusters.map((cluster) => cluster.length));
  const merged: string[] = [];
  let index = 0;
  while (index < symbols.length) {
    let matchLength = 0;
    for (
      let length = Math.min(longest, symbols.length - index);
      length > 1;
      length -= 1
    ) {
      if (clusters.has(symbols.slice(index, index + length).join("\u0000"))) {
        matchLength = length;
        break;
      }
    }
    if (matchLength === 0) {
      merged.push(symbols[index]);
      index += 1;
    } else {
      merged.push(symbols.slice(index, index + matchLength).join(""));
      index += matchLength;
    }
  }
  return merged;
};

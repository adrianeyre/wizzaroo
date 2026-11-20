export const shuffle = <Value>(
  values: readonly Value[],
  random: () => number,
): Value[] => {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

export const pickWholeNumber = (
  smallest: number,
  largest: number,
  random: () => number,
): number => smallest + Math.floor(random() * (largest - smallest + 1));

export interface GridCell {
  row: number;
  column: number;
}

export const isSameCell = (first: GridCell, second: GridCell): boolean =>
  first.row === second.row && first.column === second.column;

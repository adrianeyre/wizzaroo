import "react";

declare module "react" {
  interface CSSProperties {
    "--grid-size"?: number;
    "--grid-rows"?: number;
    "--grid-columns"?: number;
    "--word-colour"?: string;
    "--tile-x"?: number;
    "--tile-y"?: number;
    "--tile-layer"?: number;
    "--board-width"?: number;
    "--board-height"?: number;
    "--bingo-size"?: number;
    "--bingo-tilt"?: string;
    "--clock-pairs-columns"?: number;
    "--clock-pairs-sparkle"?: number;
    "--number-pyramid-rows"?: number;
    "--number-pyramid-chars"?: number;
    "--number-pyramid-row"?: number;
    "--number-trail-rows"?: number;
    "--number-trail-columns"?: number;
    "--number-trail-x"?: number;
    "--number-trail-y"?: number;
    "--ring-sort-drag-x"?: string;
    "--ring-sort-drag-y"?: string;
    "--ring-sort-rim"?: string;
    "--sentence-parade-index"?: number;
    "--tightrope-words-length"?: number;
    "--tightrope-words-x"?: string;
  }
}

import {
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";

interface MapSheetProps {
  className?: string;
  columns: readonly string[];
  rows: readonly string[];
  title: string;
  children: ReactNode;
}

interface GridSquare {
  column: number;
  row: number;
}

const findSquare = (
  event: PointerEvent<HTMLElement>,
  columns: number,
  rows: number,
): GridSquare => {
  const bounds = event.currentTarget.getBoundingClientRect();
  const across = (event.clientX - bounds.left) / bounds.width;
  const down = (event.clientY - bounds.top) / bounds.height;
  return {
    column: Math.min(columns - 1, Math.max(0, Math.floor(across * columns))),
    row: Math.min(rows - 1, Math.max(0, Math.floor(down * rows))),
  };
};

const EdgeReferences = ({
  references,
  edge,
  litIndex,
}: {
  references: readonly string[];
  edge: "top" | "bottom" | "left" | "right";
  litIndex: number | undefined;
}) => (
  <span className={`map-sheet-edge map-sheet-edge-${edge}`} aria-hidden="true">
    {references.map((reference, index) => (
      <span key={reference} data-lit={index === litIndex ? "" : undefined}>
        {reference}
      </span>
    ))}
  </span>
);

// A sheet of the explorer's map: its border carries grid references, which
// light up for the square under the pointer, and its foot carries the sheet's
// title, as a printed map's margin does.
export const MapSheet = ({
  className,
  columns,
  rows,
  title,
  children,
}: MapSheetProps) => {
  const [square, setSquare] = useState<GridSquare | undefined>(undefined);
  const sheetStyle: CSSProperties & Record<`--${string}`, number> = {
    "--map-sheet-columns": columns.length,
    "--map-sheet-rows": rows.length,
  };
  return (
    <div
      className={
        className === undefined ? "map-sheet" : `map-sheet ${className}`
      }
      style={sheetStyle}
    >
      <EdgeReferences
        references={columns}
        edge="top"
        litIndex={square?.column}
      />
      <EdgeReferences references={rows} edge="left" litIndex={square?.row} />
      <div
        className="map-sheet-face"
        onPointerMove={(event) => {
          if (event.pointerType === "mouse") {
            setSquare(findSquare(event, columns.length, rows.length));
          }
        }}
        onPointerLeave={() => {
          setSquare(undefined);
        }}
      >
        {children}
      </div>
      <EdgeReferences references={rows} edge="right" litIndex={square?.row} />
      <EdgeReferences
        references={columns}
        edge="bottom"
        litIndex={square?.column}
      />
      <p className="map-sheet-title">{title}</p>
    </div>
  );
};

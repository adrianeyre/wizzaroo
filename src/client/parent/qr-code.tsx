import { encode } from "uqr";

interface QrCodeProps {
  text: string;
  label: string;
}

const quietZoneModules = 4;

export const QrCode = ({ text, label }: QrCodeProps) => {
  const { data, size } = encode(text, { ecc: "M", border: 0 });
  const sideModules = size + quietZoneModules * 2;
  const darkModules = data.flatMap((row, rowIndex) =>
    row.flatMap((isDark, columnIndex) =>
      isDark ? [{ x: columnIndex, y: rowIndex }] : [],
    ),
  );
  return (
    <svg
      className="qr-code"
      role="img"
      aria-label={label}
      viewBox={`0 0 ${String(sideModules)} ${String(sideModules)}`}
      shapeRendering="crispEdges"
    >
      <rect width={sideModules} height={sideModules} fill="#ffffff" />
      <path
        fill="#000000"
        d={darkModules
          .map(
            ({ x, y }) =>
              `M${String(x + quietZoneModules)} ${String(y + quietZoneModules)}h1v1h-1z`,
          )
          .join("")}
      />
    </svg>
  );
};

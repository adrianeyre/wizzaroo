export const flagTextureSize = { width: 512, height: 256 } as const;

export const flagName = "Wizzaroo";

export type FlagCanvas = Pick<
  CanvasRenderingContext2D,
  | "fillStyle"
  | "strokeStyle"
  | "lineWidth"
  | "lineJoin"
  | "globalAlpha"
  | "shadowColor"
  | "shadowBlur"
  | "shadowOffsetY"
  | "font"
  | "textAlign"
  | "textBaseline"
  | "createLinearGradient"
  | "createRadialGradient"
  | "fillRect"
  | "strokeRect"
  | "beginPath"
  | "arc"
  | "moveTo"
  | "lineTo"
  | "closePath"
  | "fill"
  | "stroke"
  | "fillText"
  | "strokeText"
  | "measureText"
  | "save"
  | "restore"
>;

const flagFontFamily = `"Baloo 2 Variable", "Baloo 2", sans-serif`;
export const flagFontAt = (size: number) =>
  `800 ${String(size)}px ${flagFontFamily}`;
const largestNameSize = 104;
const smallestNameSize = 48;

const starCount = 70;

const buildStarRandom = () => {
  let seed = 20_261_117;
  return () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };
};

const traceStar = (
  canvas: FlagCanvas,
  centre: { x: number; y: number },
  points: number,
  outer: number,
  inner: number,
) => {
  canvas.beginPath();
  for (let corner = 0; corner < points * 2; corner++) {
    const radius = corner % 2 === 0 ? outer : inner;
    const angle = (corner * Math.PI) / points - Math.PI / 2;
    const x = centre.x + Math.cos(angle) * radius;
    const y = centre.y + Math.sin(angle) * radius;
    if (corner === 0) {
      canvas.moveTo(x, y);
    } else {
      canvas.lineTo(x, y);
    }
  }
  canvas.closePath();
};

const paintNight = (canvas: FlagCanvas, width: number, height: number) => {
  const night = canvas.createLinearGradient(0, 0, width, height);
  night.addColorStop(0, "#2a1272");
  night.addColorStop(0.55, "#3b1d9a");
  night.addColorStop(1, "#101a4f");
  canvas.fillStyle = night;
  canvas.fillRect(0, 0, width, height);
  const random = buildStarRandom();
  canvas.fillStyle = "#ffffff";
  for (let star = 0; star < starCount; star++) {
    canvas.globalAlpha = 0.25 + random() * 0.6;
    canvas.beginPath();
    canvas.arc(
      random() * width,
      random() * height,
      0.6 + random() * 1.6,
      0,
      Math.PI * 2,
    );
    canvas.fill();
  }
  canvas.globalAlpha = 1;
};

const buildGold = (canvas: FlagCanvas, top: number, bottom: number) => {
  const gold = canvas.createLinearGradient(0, top, 0, bottom);
  gold.addColorStop(0, "#fff3c2");
  gold.addColorStop(0.45, "#f5c542");
  gold.addColorStop(1, "#b7791f");
  return gold;
};

const paintBorder = (canvas: FlagCanvas, width: number, height: number) => {
  canvas.strokeStyle = buildGold(canvas, 0, height);
  canvas.lineWidth = 10;
  canvas.strokeRect(12, 12, width - 24, height - 24);
  canvas.lineWidth = 2;
  canvas.strokeRect(24, 24, width - 48, height - 48);
};

export const crestCentre = { x: 132, y: 128 } as const;
const crestRadius = 88;

const paintCrest = (canvas: FlagCanvas) => {
  const { x, y } = crestCentre;
  const depths = canvas.createRadialGradient(
    x - 20,
    y - 24,
    8,
    x,
    y,
    crestRadius,
  );
  depths.addColorStop(0, "#4a37c4");
  depths.addColorStop(1, "#140c45");

  canvas.save();
  canvas.shadowColor = "rgba(255, 214, 102, 0.75)";
  canvas.shadowBlur = 22;
  canvas.beginPath();
  canvas.arc(x, y, crestRadius, 0, Math.PI * 2);
  canvas.fillStyle = depths;
  canvas.fill();
  canvas.lineWidth = 9;
  canvas.strokeStyle = buildGold(canvas, y - crestRadius, y + crestRadius);
  canvas.stroke();
  canvas.restore();

  canvas.beginPath();
  canvas.arc(x, y, crestRadius - 12, 0, Math.PI * 2);
  canvas.lineWidth = 2;
  canvas.strokeStyle = "rgba(255, 233, 168, 0.55)";
  canvas.stroke();

  canvas.save();
  canvas.shadowColor = "rgba(255, 236, 170, 0.9)";
  canvas.shadowBlur = 18;
  canvas.beginPath();
  canvas.arc(x - 14, y + 4, 50, 0, Math.PI * 2);
  canvas.fillStyle = "#ffe9a8";
  canvas.fill();
  canvas.restore();
  canvas.beginPath();
  canvas.arc(x + 6, y - 8, 44, 0, Math.PI * 2);
  canvas.fillStyle = depths;
  canvas.fill();

  canvas.save();
  canvas.shadowColor = "rgba(255, 246, 207, 1)";
  canvas.shadowBlur = 20;
  traceStar(canvas, { x: x + 30, y: y - 4 }, 5, 27, 11);
  canvas.fillStyle = "#fff6cf";
  canvas.fill();
  [
    { x: x + 50, y: y - 46, size: 9 },
    { x: x - 46, y: y - 50, size: 7 },
    { x: x + 46, y: y + 44, size: 6 },
    { x: x + 8, y: y + 38, size: 5 },
  ].forEach((sparkle) => {
    traceStar(canvas, sparkle, 4, sparkle.size, sparkle.size * 0.3);
    canvas.fill();
  });
  canvas.restore();
};

const nameArea = { left: 244, right: 470 } as const;

const fitNameSize = (
  canvas: FlagCanvas,
  widest: number = nameArea.right - nameArea.left,
  largest: number = largestNameSize,
): number => {
  let size = largest;
  canvas.font = flagFontAt(size);
  while (
    size > smallestNameSize &&
    canvas.measureText(flagName).width > widest
  ) {
    size -= 2;
    canvas.font = flagFontAt(size);
  }
  return size;
};

const paintName = (
  canvas: FlagCanvas,
  height: number,
  area: { left: number; right: number; top: number } = {
    ...nameArea,
    top: 0,
  },
  largest: number = largestNameSize,
) => {
  const size = fitNameSize(canvas, area.right - area.left, largest);
  const x = (area.left + area.right) / 2;
  const y = area.top + height / 2 + size * 0.06;
  canvas.textAlign = "center";
  canvas.textBaseline = "middle";
  canvas.lineJoin = "round";
  canvas.save();
  canvas.shadowColor = "rgba(0, 0, 0, 0.55)";
  canvas.shadowBlur = 8;
  canvas.shadowOffsetY = 4;
  canvas.lineWidth = 12;
  canvas.strokeStyle = "#160b3d";
  canvas.strokeText(flagName, x, y);
  canvas.restore();
  canvas.fillStyle = buildGold(canvas, y - size / 2, y + size / 2);
  canvas.fillText(flagName, x, y);
  canvas.globalAlpha = 0.8;
  canvas.fillStyle = "#ffe9a8";
  [-1, 1].forEach((side) => {
    traceStar(canvas, { x: x + side * 70, y: y + size * 0.52 }, 4, 6, 2);
    canvas.fill();
  });
  traceStar(canvas, { x, y: y + size * 0.52 }, 5, 8, 3.4);
  canvas.fill();
  canvas.globalAlpha = 1;
};

export const drawWizzarooFlag = (
  canvas: FlagCanvas,
  width: number,
  height: number,
): void => {
  paintNight(canvas, width, height);
  paintBorder(canvas, width, height);
  paintCrest(canvas);
  paintName(canvas, height);
};

export const liveryTextureSize = { width: 512, height: 384 } as const;

export type LiveryFace = "flag" | "name";

export const liveryFaceRows: Record<
  LiveryFace,
  { bottom: number; top: number }
> = {
  flag: { bottom: 1 / 3, top: 1 },
  name: { bottom: 0, top: 1 / 3 },
};

const liveryNameHeight = 128;
const liveryNameMargin = 20;

export const drawWizzarooLivery = (canvas: FlagCanvas, width: number): void => {
  drawWizzarooFlag(canvas, width, flagTextureSize.height);
  paintName(
    canvas,
    liveryNameHeight,
    {
      left: liveryNameMargin,
      right: width - liveryNameMargin,
      top: flagTextureSize.height,
    },
    largestNameSize,
  );
};

import type { FlagCanvas } from "./wizzaroo-flag.js";

// The pirate ship's Jolly Roger: a white skull over crossed bones on black,
// drawn onto the same 512 × 256 canvas as the Wizzaroo flag so it waves on
// the same cloth.

export type JollyRogerCanvas = FlagCanvas &
  Pick<CanvasRenderingContext2D, "ellipse" | "quadraticCurveTo" | "lineCap">;

export const skullCentre = { x: 256, y: 116 } as const;

const bone = "#f4efe1";
const boneShade = "#d6cfbb";
const hollow = "#101014";

const paintCloth = (
  canvas: JollyRogerCanvas,
  width: number,
  height: number,
) => {
  const cloth = canvas.createLinearGradient(0, 0, width, height);
  cloth.addColorStop(0, "#1d1d22");
  cloth.addColorStop(0.5, "#101014");
  cloth.addColorStop(1, "#1a1a1f");
  canvas.fillStyle = cloth;
  canvas.fillRect(0, 0, width, height);
};

const paintBone = (
  canvas: JollyRogerCanvas,
  from: { x: number; y: number },
  to: { x: number; y: number },
) => {
  canvas.lineCap = "round";
  canvas.strokeStyle = boneShade;
  canvas.lineWidth = 26;
  canvas.beginPath();
  canvas.moveTo(from.x, from.y + 3);
  canvas.lineTo(to.x, to.y + 3);
  canvas.stroke();
  canvas.strokeStyle = bone;
  canvas.lineWidth = 22;
  canvas.beginPath();
  canvas.moveTo(from.x, from.y);
  canvas.lineTo(to.x, to.y);
  canvas.stroke();
  const along = { x: to.x - from.x, y: to.y - from.y };
  const length = Math.hypot(along.x, along.y);
  const across = { x: -along.y / length, y: along.x / length };
  [from, to].forEach((end) => {
    [-1, 1].forEach((side) => {
      canvas.beginPath();
      canvas.arc(
        end.x + across.x * side * 13,
        end.y + across.y * side * 13,
        17,
        0,
        Math.PI * 2,
      );
      canvas.fillStyle = bone;
      canvas.fill();
    });
  });
};

const paintCrossbones = (canvas: JollyRogerCanvas) => {
  const { x, y } = skullCentre;
  paintBone(canvas, { x: x - 128, y: y - 70 }, { x: x + 128, y: y + 96 });
  paintBone(canvas, { x: x + 128, y: y - 70 }, { x: x - 128, y: y + 96 });
};

const paintSkull = (canvas: JollyRogerCanvas) => {
  const { x, y } = skullCentre;
  canvas.save();
  canvas.shadowColor = "rgba(0, 0, 0, 0.6)";
  canvas.shadowBlur = 12;
  canvas.fillStyle = bone;
  canvas.beginPath();
  canvas.ellipse(x, y - 14, 66, 60, 0, 0, Math.PI * 2);
  canvas.fill();
  canvas.beginPath();
  canvas.moveTo(x - 42, y + 22);
  canvas.lineTo(x + 42, y + 22);
  canvas.quadraticCurveTo(x + 46, y + 62, x + 30, y + 70);
  canvas.lineTo(x - 30, y + 70);
  canvas.quadraticCurveTo(x - 46, y + 62, x - 42, y + 22);
  canvas.closePath();
  canvas.fill();
  canvas.restore();
  canvas.fillStyle = hollow;
  [-1, 1].forEach((side) => {
    canvas.beginPath();
    canvas.ellipse(x + side * 26, y - 6, 19, 22, side * -0.25, 0, Math.PI * 2);
    canvas.fill();
  });
  canvas.beginPath();
  canvas.moveTo(x, y + 18);
  canvas.lineTo(x - 10, y + 36);
  canvas.lineTo(x + 10, y + 36);
  canvas.closePath();
  canvas.fill();
  canvas.strokeStyle = hollow;
  canvas.lineCap = "round";
  canvas.lineWidth = 4;
  canvas.beginPath();
  canvas.moveTo(x - 30, y + 52);
  canvas.lineTo(x + 30, y + 52);
  canvas.stroke();
  [-20, -10, 0, 10, 20].forEach((tooth) => {
    canvas.beginPath();
    canvas.moveTo(x + tooth, y + 44);
    canvas.lineTo(x + tooth, y + 62);
    canvas.stroke();
  });
};

export const drawJollyRoger = (
  canvas: JollyRogerCanvas,
  width: number,
  height: number,
): void => {
  paintCloth(canvas, width, height);
  paintCrossbones(canvas);
  paintSkull(canvas);
};

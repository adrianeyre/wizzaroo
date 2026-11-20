import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";
import type { IslandRegionLandmark } from "../curriculum/islands.js";
import { subjectNames, type Subject } from "../curriculum/skills.js";
import type { RegionLandmark } from "../curriculum/world-map.js";
import { useMotionScale } from "./world-map-hooks.js";

const headingTextureWidth = 512;
const headingTextureHeight = 128;
const headingFontFamily = `"Baloo 2 Variable", "Baloo 2", sans-serif`;
export const headingFontSizes = { largest: 76, smallest: 30 } as const;
const headingLetterSpacing = 10;
export const headingSidePadding = 48;
const headingFontAt = (size: number) =>
  `800 ${String(size)}px ${headingFontFamily}`;
const headingFont = headingFontAt(headingFontSizes.largest);
const headingPalette = {
  plaque: "rgb(8 12 28 / 0.84)",
  ink: "#ffffff",
} as const;

const checksHeading = "Checks";

export const findRegionHeading = ({
  subject,
  landmark,
}: {
  subject: Subject | undefined;
  landmark: RegionLandmark | IslandRegionLandmark;
}): string | undefined => {
  if (subject !== undefined) {
    return subjectNames[subject];
  }
  return landmark === "challenge-arena" ? checksHeading : undefined;
};

export const regionHeadingHeight = 10.5;
const headingScale: [number, number, number] = [8, 2, 1];

interface HeadingTextContext {
  font: string;
  letterSpacing: string;
  measureText: (text: string) => { width: number };
}

const measureHeading = (context: HeadingTextContext, label: string) => {
  context.letterSpacing = "0px";
  return context.measureText(label).width + headingLetterSpacing * label.length;
};

export const fitHeadingFont = (
  context: HeadingTextContext,
  label: string,
  roomForText: number,
): number => {
  let size: number = headingFontSizes.largest;
  context.font = headingFontAt(size);
  while (
    size > headingFontSizes.smallest &&
    measureHeading(context, label) > roomForText
  ) {
    size -= 2;
    context.font = headingFontAt(size);
  }
  const spareRoom = roomForText - context.measureText(label).width;
  const letterSpacing = Math.max(
    0,
    Math.min(headingLetterSpacing, Math.floor(spareRoom / label.length)),
  );
  context.letterSpacing = `${String(letterSpacing)}px`;
  return letterSpacing;
};

const drawHeading = (
  canvas: HTMLCanvasElement,
  text: string,
  accent: string,
): boolean => {
  const context = canvas.getContext("2d");
  if (context === null) {
    return false;
  }
  const { width, height } = canvas;
  const inset = 6;
  context.clearRect(0, 0, width, height);
  context.beginPath();
  context.roundRect(inset, inset, width - inset * 2, height - inset * 2, 40);
  context.fillStyle = headingPalette.plaque;
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = accent;
  context.stroke();
  const label = text.toUpperCase();
  const letterSpacing = fitHeadingFont(
    context,
    label,
    width - headingSidePadding * 2,
  );
  context.fillStyle = headingPalette.ink;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, width / 2 + letterSpacing / 2, height / 2 + 6);
  return true;
};

interface HeadingFace {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
}

const buildHeadingFace = (
  text: string,
  accent: string,
): HeadingFace | undefined => {
  const canvas = document.createElement("canvas");
  canvas.width = headingTextureWidth;
  canvas.height = headingTextureHeight;
  if (!drawHeading(canvas, text, accent)) {
    return undefined;
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, texture };
};

export const RegionHeading = ({
  regionId,
  text,
  accent,
}: {
  regionId: string;
  text: string;
  accent: string;
}) => {
  const heading = useRef<Group>(null);
  const age = useRef(0);
  const motionScale = useMotionScale();
  const face = useMemo(() => buildHeadingFace(text, accent), [text, accent]);

  useEffect(() => {
    if (face === undefined) {
      return;
    }
    let isShown = true;
    void document.fonts.load(headingFont).then(() => {
      if (isShown && drawHeading(face.canvas, text, accent)) {
        face.texture.needsUpdate = true;
      }
    });
    return () => {
      isShown = false;
      face.texture.dispose();
    };
  }, [face, text, accent]);

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    if (heading.current !== null) {
      heading.current.position.y =
        regionHeadingHeight + Math.sin(age.current * 1.2) * 0.2;
    }
  });

  return (
    <group
      ref={heading}
      name={`region-heading-${regionId}`}
      position={[0, regionHeadingHeight, 0]}
    >
      {face === undefined ? null : (
        <sprite scale={headingScale} renderOrder={20}>
          <spriteMaterial
            map={face.texture}
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      )}
    </group>
  );
};

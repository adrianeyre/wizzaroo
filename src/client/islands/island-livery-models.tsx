import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace, type BufferGeometry } from "three";
import { useBuiltGeometry } from "../world-map-hooks.js";
import {
  drawWizzarooFlag,
  drawWizzarooLivery,
  flagFontAt,
  flagTextureSize,
  liveryTextureSize,
} from "./wizzaroo-flag.js";
import { drawJollyRoger } from "./jolly-roger-flag.js";

const useCanvasTexture = (
  width: number,
  height: number,
  paint: (context: CanvasRenderingContext2D) => void,
): CanvasTexture => {
  const face = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture };
  }, [width, height]);
  useEffect(
    () => () => {
      face.texture.dispose();
    },
    [face],
  );
  useEffect(() => {
    if (face.canvas.getContext("2d") === null) {
      return;
    }
    let isShown = true;
    void document.fonts.load(flagFontAt(100)).then(() => {
      const context = face.canvas.getContext("2d");
      if (isShown && context !== null) {
        paint(context);
        face.texture.needsUpdate = true;
      }
    });
    return () => {
      isShown = false;
    };
  }, [face, paint]);
  return face.texture;
};

const paintFlag = (context: CanvasRenderingContext2D) => {
  drawWizzarooFlag(context, flagTextureSize.width, flagTextureSize.height);
};

const paintLivery = (context: CanvasRenderingContext2D) => {
  drawWizzarooLivery(context, liveryTextureSize.width);
};

const paintJollyRoger = (context: CanvasRenderingContext2D) => {
  drawJollyRoger(context, flagTextureSize.width, flagTextureSize.height);
};

export const useJollyRogerTexture = (): CanvasTexture =>
  useCanvasTexture(
    flagTextureSize.width,
    flagTextureSize.height,
    paintJollyRoger,
  );

export const useWizzarooFlagTexture = (): CanvasTexture =>
  useCanvasTexture(flagTextureSize.width, flagTextureSize.height, paintFlag);

export const useWizzarooLiveryTexture = (): CanvasTexture =>
  useCanvasTexture(
    liveryTextureSize.width,
    liveryTextureSize.height,
    paintLivery,
  );

export const LiveryDecals = ({
  buildGeometry,
  name,
}: {
  buildGeometry: () => BufferGeometry;
  name: string;
}) => {
  const geometry = useBuiltGeometry(buildGeometry);
  const texture = useWizzarooLiveryTexture();
  return (
    <mesh name={name} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        map={texture}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        roughness={0.45}
        metalness={0.05}
      />
    </mesh>
  );
};

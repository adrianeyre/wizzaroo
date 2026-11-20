import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  Color,
  SRGBColorSpace,
  ShaderMaterial,
  Vector3,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPixelatedPass } from "three/addons/postprocessing/RenderPixelatedPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

export const retroPalette = {
  ink: "#0b0b1a",
  paper: "#f4f4f0",
  slate: "#5a5a6e",
  mist: "#a8a8b8",
  navy: "#1c2f8c",
  sky: "#3fa0ff",
  cyan: "#3ce0e0",
  forest: "#16733a",
  grass: "#5fd03c",
  sun: "#ffe14a",
  orange: "#ff9a1f",
  red: "#e8312e",
  bark: "#7a4421",
  plum: "#4a1e78",
  purple: "#9b3fd1",
  lilac: "#d29bff",
} as const;

const retroPaletteColours = Object.values(retroPalette);

const paletteVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const paletteFragmentShader = `
uniform sampler2D tDiffuse;
uniform vec3 palette[PALETTE_SIZE];
varying vec2 vUv;

void main() {
  vec3 colour = texture2D(tDiffuse, vUv).rgb;
  vec3 nearest = palette[0];
  float nearestDistance = distance(colour, nearest);
  for (int index = 1; index < PALETTE_SIZE; index++) {
    float candidateDistance = distance(colour, palette[index]);
    if (candidateDistance < nearestDistance) {
      nearest = palette[index];
      nearestDistance = candidateDistance;
    }
  }
  gl_FragColor = vec4(nearest, 1.0);
}
`;

export const buildPaletteUniform = (palette: readonly string[]): Vector3[] =>
  palette.map((hex) => {
    const { r, g, b } = new Color(hex).getRGB(new Color(), SRGBColorSpace);
    return new Vector3(r, g, b);
  });

interface PixelComposerParts {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: Camera;
  isPaletteLimited: boolean;
}

interface PixelComposer {
  composer: EffectComposer;
  pixelatedPass: RenderPixelatedPass;
}

const startingPixelSize = 4;

const buildPixelComposer = ({
  renderer,
  scene,
  camera,
  isPaletteLimited,
}: PixelComposerParts): PixelComposer => {
  const paletteMaterial = new ShaderMaterial({
    defines: { PALETTE_SIZE: retroPaletteColours.length },
    uniforms: {
      tDiffuse: { value: null },
      palette: { value: buildPaletteUniform(retroPaletteColours) },
    },
    vertexShader: paletteVertexShader,
    fragmentShader: paletteFragmentShader,
  });

  const composer = new EffectComposer(renderer);
  const pixelatedPass = new RenderPixelatedPass(
    startingPixelSize,
    scene,
    camera,
  );
  composer.addPass(pixelatedPass);
  composer.addPass(new OutputPass());
  if (isPaletteLimited) {
    composer.addPass(new ShaderPass(paletteMaterial));
  }
  return { composer, pixelatedPass };
};

interface PixelPipelineProps {
  pixelSize: number;
  isPaletteLimited: boolean;
}

export const PixelPipeline = ({
  pixelSize,
  isPaletteLimited,
}: PixelPipelineProps) => {
  const renderer = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  const { composer, pixelatedPass } = useMemo(
    () => buildPixelComposer({ renderer, scene, camera, isPaletteLimited }),
    [renderer, scene, camera, isPaletteLimited],
  );

  useEffect(() => {
    pixelatedPass.setPixelSize(pixelSize);
  }, [pixelatedPass, pixelSize]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size]);

  useEffect(
    () => () => {
      for (const pass of composer.passes) {
        pass.dispose();
      }
      composer.dispose();
    },
    [composer],
  );

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
};

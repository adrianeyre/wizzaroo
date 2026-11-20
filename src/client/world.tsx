import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BusyProgress } from "./busy/busy-progress.js";
import { getMotionScale } from "./reduced-motion.js";
import { ShaderMaterial, type Group, type Points } from "three";
import type { GeographyGame } from "../curriculum/geography.js";
import type { HistoryQuest } from "../curriculum/history-quests.js";
import type { PhonicsGame } from "../curriculum/phonics-games.js";
import { HistoryQuestWorld } from "./history-world.js";
import { IslandStageProps } from "./islands/island-stage-props.js";
import type { QuestionGameType } from "../curriculum/world-map.js";
import { isEnglishGameType } from "../curriculum/english-games.js";
import { BayGameWorld, isBayGameType } from "./bay-games.js";
import { isComputingGameType } from "../curriculum/computing-games.js";
import { ComputingLabWorld } from "./computing-lab.js";
import { findMusicGame, isMusicGameType } from "../curriculum/music-games.js";
import { MusicGameWorld } from "./music-stage.js";
import { WoodsGameWorld } from "./woods-games.js";
import { CaveGameWorld } from "./crystal-cave-games.js";
import { GeographyGameWorld } from "./geography/geography-stage.js";
import type { QuestionPrompt } from "./mission/mission.js";
import { PixelPipeline, retroPalette } from "./pixel-pipeline.js";
import { ScienceLabWorld } from "./science-lab.js";
import {
  getRenderQuality,
  renderQualityLevels,
  startRenderQualityTracker,
  trackFrame,
  type RenderQuality,
} from "./render-quality.js";
import {
  BubbleBurst,
  StudioBackdrop,
  StudioCompanion,
  StudioLights,
  StudioReflections,
  bobHeight,
  bubbleFilm,
  bubbleGrowSeconds,
  bubbleWobble,
  buildSparkleDirections,
  cameraDistance,
  cameraFieldOfView,
  easeOutBack,
  sparkleLifeSeconds,
  sparkleSpeed,
  useChoicePositions,
  useChoiceRadius,
  useCompanionMotion,
  useSoapFilmClock,
  useSparkleGeometry,
  type CompanionMood,
} from "./studio-stage.js";

export interface MissionSceneProps {
  gameType: QuestionGameType;
  phonicsGame: PhonicsGame | undefined;
  geographyGame: GeographyGame | undefined;
  historyQuest: HistoryQuest | undefined;
  islandId?: string;
  prompt: QuestionPrompt | undefined;
  choices: readonly string[];
  hiddenChoiceIndexes: readonly number[];
  companionMood: CompanionMood;
  poppedChoiceIndex: number | undefined;
  popCount: number;
}

interface MissionWorldProps extends MissionSceneProps {
  isEffectsOn: boolean;
}

export interface RenderSample {
  fps: number;
  pixelSize: number;
  isEffectsOn: boolean;
  renderWidth: number;
  renderHeight: number;
  drawCalls: number;
}

type SceneLook = "pixel" | "studio";

interface ChoiceObjectProps {
  position: [number, number, number];
  radius: number;
  index: number;
}

const RetroChoiceObject = ({
  gameType,
  position,
  radius,
  index,
}: ChoiceObjectProps & { gameType: QuestionGameType }) => {
  const choice = useRef<Group>(null);
  const age = useRef(0);
  const [motionScale] = useState(getMotionScale);

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    if (choice.current !== null) {
      choice.current.position.y =
        position[1] +
        Math.sin(age.current * 2 + index) * bobHeight * motionScale;
    }
  });

  return (
    <group ref={choice} position={position}>
      {gameType === "popping-bubbles" ? (
        <mesh>
          <icosahedronGeometry args={[radius, 2]} />
          <meshStandardMaterial color={retroPalette.cyan} flatShading />
        </mesh>
      ) : (
        <mesh>
          <boxGeometry args={[radius * 1.8, radius * 1.8, radius * 0.4]} />
          <meshStandardMaterial color={retroPalette.sun} flatShading />
        </mesh>
      )}
    </group>
  );
};

const BubbleChoice = ({
  position,
  radius,
  index,
  material,
}: ChoiceObjectProps & { material: ShaderMaterial }) => {
  const bubble = useRef<Group>(null);
  const age = useRef(0);
  const [motionScale] = useState(getMotionScale);

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    const body = bubble.current;
    if (body === null) {
      return;
    }
    const growth =
      motionScale === 0
        ? 1
        : easeOutBack(Math.min(1, age.current / bubbleGrowSeconds));
    const wobble =
      Math.sin(age.current * 2.3 + index * 1.7) * bubbleWobble * motionScale;
    body.position.y =
      position[1] +
      Math.sin(age.current * 1.6 + index * 1.3) * bobHeight * motionScale;
    body.scale.set(growth * (1 + wobble), growth * (1 - wobble), 1);
  });

  return (
    <group ref={bubble} position={position} name="bubble">
      <mesh material={material}>
        <planeGeometry args={[radius * 2, radius * 2]} />
      </mesh>
    </group>
  );
};

const RetroCompanion = ({ mood }: { mood: CompanionMood }) => {
  const { companion, position } = useCompanionMotion(mood);

  return (
    <group ref={companion} name="companion" position={position}>
      <mesh>
        <icosahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial color={retroPalette.orange} flatShading />
      </mesh>
      <mesh position={[-0.2, 0.15, 0.48]}>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshStandardMaterial color={retroPalette.ink} flatShading />
      </mesh>
      <mesh position={[0.2, 0.15, 0.48]}>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshStandardMaterial color={retroPalette.ink} flatShading />
      </mesh>
      <mesh position={[-0.32, 0.55, 0]} rotation={[0, 0, 0.4]}>
        <coneGeometry args={[0.14, 0.4, 5]} />
        <meshStandardMaterial color={retroPalette.red} flatShading />
      </mesh>
      <mesh position={[0.32, 0.55, 0]} rotation={[0, 0, -0.4]}>
        <coneGeometry args={[0.14, 0.4, 5]} />
        <meshStandardMaterial color={retroPalette.red} flatShading />
      </mesh>
    </group>
  );
};

const RetroSparkles = ({
  position,
}: {
  position: [number, number, number];
}) => {
  const sparkles = useRef<Points>(null);
  const directions = useMemo(() => buildSparkleDirections(), []);
  const geometry = useSparkleGeometry();
  const age = useRef(0);

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds;
    const points = sparkles.current;
    if (points === null) {
      return;
    }
    points.visible = age.current < sparkleLifeSeconds;
    const positions = geometry.getAttribute("position");
    directions.forEach((direction, index) => {
      const reach = age.current * sparkleSpeed;
      positions.setXYZ(
        index,
        position[0] + direction.x * reach,
        position[1] + direction.y * reach,
        position[2] + direction.z * reach,
      );
    });
    positions.needsUpdate = true;
  });

  return (
    <points ref={sparkles} geometry={geometry}>
      <pointsMaterial color={retroPalette.sun} size={0.18} />
    </points>
  );
};

const RetroBackdrop = () => (
  <>
    <mesh position={[0, -2.4, -2]}>
      <boxGeometry args={[30, 0.4, 12]} />
      <meshStandardMaterial color={retroPalette.grass} flatShading />
    </mesh>
    {[-5.5, -3.2, 3.8, 6].map((x) => (
      <group key={x} position={[x, -1.2, -5]}>
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 1.2, 5]} />
          <meshStandardMaterial color={retroPalette.bark} flatShading />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <coneGeometry args={[1, 2, 6]} />
          <meshStandardMaterial color={retroPalette.forest} flatShading />
        </mesh>
      </group>
    ))}
  </>
);

const BubbleWorld = ({
  gameType,
  choices,
  hiddenChoiceIndexes,
  companionMood,
  poppedChoiceIndex,
  popCount,
  isEffectsOn,
}: MissionWorldProps) => {
  const radius = useChoiceRadius();
  const choicePositions = useChoicePositions(choices.length, gameType);
  useSoapFilmClock();
  const poppedPosition =
    poppedChoiceIndex === undefined
      ? undefined
      : choicePositions[poppedChoiceIndex];

  return (
    <>
      <StudioLights />
      <StudioBackdrop />
      <StudioCompanion mood={companionMood} />
      {choicePositions.map((position, index) =>
        hiddenChoiceIndexes.includes(index) ? null : (
          <BubbleChoice
            key={`${String(popCount)}-${String(index)}`}
            position={position}
            radius={radius}
            index={index}
            material={bubbleFilm}
          />
        ),
      )}
      {isEffectsOn && poppedPosition !== undefined ? (
        <BubbleBurst key={popCount} position={poppedPosition} radius={radius} />
      ) : null}
    </>
  );
};

const RetroWorld = ({
  gameType,
  choices,
  hiddenChoiceIndexes,
  companionMood,
  poppedChoiceIndex,
  popCount,
  isEffectsOn,
}: MissionWorldProps) => {
  const radius = useChoiceRadius();
  const choicePositions = useChoicePositions(choices.length, gameType);
  const poppedPosition =
    poppedChoiceIndex === undefined
      ? undefined
      : choicePositions[poppedChoiceIndex];

  return (
    <>
      <color attach="background" args={[retroPalette.sky]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 2]} intensity={2.2} />
      <RetroBackdrop />
      <RetroCompanion mood={companionMood} />
      {choicePositions.map((position, index) =>
        hiddenChoiceIndexes.includes(index) ? null : (
          <RetroChoiceObject
            key={index}
            gameType={gameType}
            position={position}
            radius={radius}
            index={index}
          />
        ),
      )}
      {isEffectsOn && poppedPosition !== undefined ? (
        <RetroSparkles key={popCount} position={poppedPosition} />
      ) : null}
    </>
  );
};

const findSceneLook = (gameType: QuestionGameType): SceneLook =>
  gameType === "listen-and-pick" ? "pixel" : "studio";

export const MissionWorld = (worldProps: MissionWorldProps) => (
  <>
    <StageForGame {...worldProps} />
    <IslandStageProps
      islandId={worldProps.islandId}
      gameType={worldProps.gameType}
    />
  </>
);

const StageForGame = ({
  gameType,
  phonicsGame,
  geographyGame,
  ...worldProps
}: MissionWorldProps) => {
  if (geographyGame !== undefined) {
    return (
      <GeographyGameWorld
        scene={geographyGame.scene}
        show={
          worldProps.prompt?.kind === "geography"
            ? worldProps.prompt.show
            : undefined
        }
        companionMood={worldProps.companionMood}
        popCount={worldProps.popCount}
        isEffectsOn={worldProps.isEffectsOn}
      />
    );
  }
  if (isMusicGameType(gameType)) {
    const { prompt, ...stageProps } = worldProps;
    return (
      <MusicGameWorld
        gameType={gameType}
        game={findMusicGame(gameType)}
        prompt={prompt?.kind === "music" ? prompt.music : undefined}
        {...stageProps}
      />
    );
  }
  if (phonicsGame !== undefined) {
    return <CaveGameWorld phonicsGame={phonicsGame} {...worldProps} />;
  }
  if (worldProps.historyQuest !== undefined) {
    return (
      <HistoryQuestWorld
        {...worldProps}
        historyQuest={worldProps.historyQuest}
      />
    );
  }
  if (isBayGameType(gameType)) {
    return <BayGameWorld gameType={gameType} {...worldProps} />;
  }
  if (isEnglishGameType(gameType)) {
    return <WoodsGameWorld gameType={gameType} {...worldProps} />;
  }
  if (gameType === "science-lab") {
    return <ScienceLabWorld {...worldProps} />;
  }
  if (isComputingGameType(gameType)) {
    return <ComputingLabWorld gameType={gameType} {...worldProps} />;
  }
  return gameType === "popping-bubbles" ? (
    <BubbleWorld
      gameType={gameType}
      phonicsGame={phonicsGame}
      geographyGame={geographyGame}
      {...worldProps}
    />
  ) : (
    <RetroWorld
      gameType={gameType}
      phonicsGame={phonicsGame}
      geographyGame={geographyGame}
      {...worldProps}
    />
  );
};

const sampleEverySeconds = 0.5;

const RenderQualityGovernor = ({
  renderScale,
  onQualityChanged,
  onRenderSample,
}: {
  renderScale: number;
  onQualityChanged: (quality: RenderQuality) => void;
  onRenderSample: (sample: RenderSample) => void;
}) => {
  const size = useThree((state) => state.size);
  const tracker = useRef(startRenderQualityTracker());
  const sinceSample = useRef(0);

  useFrame(({ gl: renderer }, deltaSeconds) => {
    renderer.info.autoReset = false;
    const before = tracker.current;
    tracker.current = trackFrame(before, deltaSeconds);
    const quality = getRenderQuality(tracker.current);
    if (tracker.current.levelIndex !== before.levelIndex) {
      onQualityChanged(quality);
    }
    sinceSample.current += deltaSeconds;
    if (sinceSample.current >= sampleEverySeconds) {
      sinceSample.current = 0;
      onRenderSample({
        fps: Math.round(tracker.current.fps ?? 1 / deltaSeconds),
        pixelSize: quality.pixelSize,
        isEffectsOn: quality.isEffectsOn,
        renderWidth: Math.floor(size.width * renderScale),
        renderHeight: Math.floor(size.height * renderScale),
        drawCalls: renderer.info.render.calls,
      });
    }
    renderer.info.reset();
  }, 2);

  return null;
};

const PerformanceOverlay = ({
  sample,
}: {
  sample: RenderSample | undefined;
}) =>
  sample === undefined ? null : (
    <p className="performance-overlay" aria-live="off">
      {sample.fps} fps · {sample.renderWidth}×{sample.renderHeight} (pixel{" "}
      {sample.pixelSize}) · {sample.drawCalls} draw calls · effects{" "}
      {sample.isEffectsOn ? "on" : "off"}
    </p>
  );

const isPerformanceOverlayAsked = () =>
  new URLSearchParams(window.location.search).has("performance");

interface RetroCanvasProps {
  cameraPosition: [number, number, number];
  cameraFieldOfView: number;
  renderScene: (isEffectsOn: boolean) => ReactNode;
  /**
   * What the scene is, to say it is being got ready (such as "Getting the
   * World Map ready…") until its first picture is drawn.
   */
  loadingLabel?: string;
}

/** Calls `onDrawn` once the scene's first picture has been drawn. */
export const FirstFrameSignal = ({ onDrawn }: { onDrawn: () => void }) => {
  const isSignalled = useRef(false);
  useFrame(() => {
    if (isSignalled.current) {
      return;
    }
    isSignalled.current = true;
    // The next frame only starts once this one has been drawn.
    requestAnimationFrame(onDrawn);
  });
  return null;
};

const SceneGettingReady = ({
  label,
  isDrawn,
}: {
  label: string | undefined;
  isDrawn: boolean;
}) =>
  label === undefined || isDrawn ? null : (
    <div className="scene-getting-ready" aria-busy="true">
      <BusyProgress label={label} />
    </div>
  );

export const RetroCanvas = ({
  cameraPosition,
  cameraFieldOfView: fov,
  renderScene,
  loadingLabel,
}: RetroCanvasProps) => {
  const [quality, setQuality] = useState(() =>
    getRenderQuality(startRenderQualityTracker()),
  );
  const [isOverlayShown] = useState(isPerformanceOverlayAsked);
  const [sample, setSample] = useState<RenderSample>();
  const [isDrawn, setIsDrawn] = useState(false);

  return (
    <>
      <Canvas
        dpr={1}
        gl={{ antialias: false }}
        camera={{ position: cameraPosition, fov }}
      >
        {renderScene(quality.isEffectsOn)}
        <PixelPipeline pixelSize={quality.pixelSize} isPaletteLimited />
        <RenderQualityGovernor
          renderScale={1 / quality.pixelSize}
          onQualityChanged={setQuality}
          onRenderSample={isOverlayShown ? setSample : () => undefined}
        />
        <FirstFrameSignal
          onDrawn={() => {
            setIsDrawn(true);
          }}
        />
      </Canvas>
      <SceneGettingReady label={loadingLabel} isDrawn={isDrawn} />
      {isOverlayShown ? <PerformanceOverlay sample={sample} /> : null}
    </>
  );
};

const sharpestPixelRatio = 2;

const findDetailedPixelRatio = ({ pixelSize }: RenderQuality): number =>
  (Math.min(window.devicePixelRatio, sharpestPixelRatio) *
    renderQualityLevels[0].pixelSize) /
  pixelSize;

const DetailedResolution = ({ pixelRatio }: { pixelRatio: number }) => {
  const setDpr = useThree((state) => state.setDpr);
  useEffect(() => {
    setDpr(pixelRatio);
  }, [setDpr, pixelRatio]);
  useFrame(({ gl: renderer, scene, camera }) => {
    renderer.render(scene, camera);
  }, 1);
  return null;
};

export const DetailedCanvas = ({
  cameraPosition,
  cameraFieldOfView: fov,
  renderScene,
  loadingLabel,
}: RetroCanvasProps) => {
  const [quality, setQuality] = useState(() =>
    getRenderQuality(startRenderQualityTracker()),
  );
  const [isOverlayShown] = useState(isPerformanceOverlayAsked);
  const [sample, setSample] = useState<RenderSample>();
  const [isDrawn, setIsDrawn] = useState(false);
  const pixelRatio = findDetailedPixelRatio(quality);

  return (
    <>
      <Canvas
        shadows
        dpr={pixelRatio}
        gl={{ antialias: true }}
        camera={{ position: cameraPosition, fov, near: 0.5, far: 1100 }}
      >
        {renderScene(quality.isEffectsOn)}
        <DetailedResolution pixelRatio={pixelRatio} />
        <RenderQualityGovernor
          renderScale={pixelRatio}
          onQualityChanged={setQuality}
          onRenderSample={isOverlayShown ? setSample : () => undefined}
        />
        <FirstFrameSignal
          onDrawn={() => {
            setIsDrawn(true);
          }}
        />
      </Canvas>
      <SceneGettingReady label={loadingLabel} isDrawn={isDrawn} />
      {isOverlayShown ? <PerformanceOverlay sample={sample} /> : null}
    </>
  );
};

const gameLoadingLabel = "Setting up the Game…";

export const GameCanvas = (sceneProps: MissionSceneProps) => {
  const renderMissionWorld = (isEffectsOn: boolean) => (
    <MissionWorld {...sceneProps} isEffectsOn={isEffectsOn} />
  );
  const cameraPosition: [number, number, number] = [0, 0, cameraDistance];

  return findSceneLook(sceneProps.gameType) === "studio" ? (
    <DetailedCanvas
      cameraPosition={cameraPosition}
      cameraFieldOfView={cameraFieldOfView}
      loadingLabel={gameLoadingLabel}
      renderScene={(isEffectsOn) => (
        <>
          {renderMissionWorld(isEffectsOn)}
          <StudioReflections />
        </>
      )}
    />
  ) : (
    <RetroCanvas
      cameraPosition={cameraPosition}
      cameraFieldOfView={cameraFieldOfView}
      loadingLabel={gameLoadingLabel}
      renderScene={renderMissionWorld}
    />
  );
};

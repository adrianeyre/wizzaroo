import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, type RefObject } from "react";
import type { Group } from "three";
import type { CharacterLoadout } from "../../curriculum/catalogue.js";
import { getMotionScale } from "../reduced-motion.js";
import {
  buildCharacterLook,
  buildShowOffLook,
  describeCharacter,
} from "./character-look.js";
import { Head, SpeakingMouthContext, headHeight } from "./character-model.js";
import {
  FidgetingFigure,
  findRiderLift,
  ShowingOffCharacter,
  type PetPlace,
} from "./character-show-off.js";

type Framing =
  | "full-length"
  | "full-length-with-company"
  | "head-and-shoulders"
  | "head-and-shoulders-with-pet";

interface Shot {
  cameraHeight: number;
  cameraDistance: number;
  lookAtHeight: number;
  fieldOfView: number;
}

const shots: Record<Framing, Shot> = {
  "full-length": {
    cameraHeight: 1.4,
    cameraDistance: 5.4,
    lookAtHeight: 1.2,
    fieldOfView: 32,
  },
  "full-length-with-company": {
    cameraHeight: 1.6,
    cameraDistance: 6.8,
    lookAtHeight: 1.35,
    fieldOfView: 32,
  },
  "head-and-shoulders": {
    cameraHeight: headHeight,
    cameraDistance: 3,
    lookAtHeight: headHeight - 0.05,
    fieldOfView: 32,
  },
  "head-and-shoulders-with-pet": {
    cameraHeight: headHeight - 0.1,
    cameraDistance: 3.8,
    lookAtHeight: headHeight - 0.25,
    fieldOfView: 32,
  },
};

const sharpestPixelRatio: [number, number] = [1, 2];
const swayTurns = 0.35;
const swaySpeed = 0.6;
const dragTurnPerPixel = 0.02;
const skyLightColour = "#ffffff";
const groundLightColour = "#c9b8a6";
const keyLightColour = "#fff4e6";
const rimLightColour = "#cfe6ff";
const plinthColour = "#f1f5f9";
const plinthEdgeColour = "#cbd5e1";
const contactShadowColour = "#0f172a";
const contactShadowOpacity = 0.18;

export const StudioLights = () => (
  <>
    <hemisphereLight args={[skyLightColour, groundLightColour, 1.4]} />
    <directionalLight
      position={[2.5, 4, 3.5]}
      intensity={1.8}
      color={keyLightColour}
    />
    <directionalLight
      position={[-3, 2.5, -3]}
      intensity={1.2}
      color={rimLightColour}
    />
  </>
);

const findShot = (framing: Framing, loadout: CharacterLoadout): Shot => {
  const shot = shots[framing];
  const isFullLength =
    framing === "full-length" || framing === "full-length-with-company";
  const lift = isFullLength ? 0 : findRiderLift(buildShowOffLook(loadout));
  return {
    ...shot,
    cameraHeight: shot.cameraHeight + lift,
    lookAtHeight: shot.lookAtHeight + lift,
  };
};

const TurningCharacter = ({
  loadout,
  dragTurnRef,
  isSwaying,
  showOffCount,
  petPlace,
  isFidgeting,
}: {
  loadout: CharacterLoadout;
  dragTurnRef: RefObject<number>;
  isSwaying: boolean;
  showOffCount: number;
  petPlace: PetPlace;
  isFidgeting: boolean;
}) => {
  const character = useRef<Group>(null);
  const age = useRef(0);
  const [motionScale] = useState(getMotionScale);

  useFrame((_state, deltaSeconds) => {
    age.current += deltaSeconds * motionScale;
    if (character.current === null) {
      return;
    }
    const sway = isSwaying ? Math.sin(age.current * swaySpeed) * swayTurns : 0;
    character.current.rotation.y = sway + dragTurnRef.current;
  });

  const showingOffCharacter = (
    <ShowingOffCharacter
      loadout={loadout}
      showOffCount={showOffCount}
      petPlace={petPlace}
    />
  );
  return (
    <group ref={character}>
      {isFidgeting ? (
        <FidgetingFigure>{showingOffCharacter}</FidgetingFigure>
      ) : (
        showingOffCharacter
      )}
    </group>
  );
};

const CharacterStage = ({
  loadout,
  framing,
  isTurnable,
  dragTurnRef,
  showOffCount = 0,
  petPlace = "ground",
  isFidgeting = false,
  readMouthOpenness,
}: {
  loadout: CharacterLoadout;
  framing: Framing;
  isTurnable: boolean;
  dragTurnRef: RefObject<number>;
  showOffCount?: number;
  petPlace?: PetPlace;
  isFidgeting?: boolean;
  /** Set while the Character speaks, so its mouth moves with the words (ADR 0077). */
  readMouthOpenness?: () => number;
}) => {
  const shot = useMemo(() => findShot(framing, loadout), [framing, loadout]);
  const dragFromX = useRef<number>(undefined);

  return (
    <div
      className="character-stage"
      onPointerDown={(event) => {
        if (!isTurnable) {
          return;
        }
        dragFromX.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (dragFromX.current === undefined) {
          return;
        }
        dragTurnRef.current +=
          (event.clientX - dragFromX.current) * dragTurnPerPixel;
        dragFromX.current = event.clientX;
      }}
      onPointerUp={() => {
        dragFromX.current = undefined;
      }}
    >
      <Canvas
        flat
        dpr={sharpestPixelRatio}
        frameloop={
          isTurnable || readMouthOpenness !== undefined ? "always" : "demand"
        }
        gl={{ antialias: true, alpha: true }}
        camera={{
          position: [0, shot.cameraHeight, shot.cameraDistance],
          fov: shot.fieldOfView,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0, shot.lookAtHeight, 0);
        }}
      >
        <StudioLights />
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.95, 1, 0.12, 48]} />
          <meshStandardMaterial color={plinthColour} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.125, 0]}>
          <cylinderGeometry args={[1, 1, 0.02, 48]} />
          <meshStandardMaterial color={plinthEdgeColour} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.55, 40]} />
          <meshBasicMaterial
            color={contactShadowColour}
            transparent
            opacity={contactShadowOpacity}
            depthWrite={false}
          />
        </mesh>
        <SpeakingMouthContext value={readMouthOpenness}>
          <TurningCharacter
            loadout={loadout}
            dragTurnRef={dragTurnRef}
            isSwaying={isTurnable}
            showOffCount={showOffCount}
            petPlace={petPlace}
            isFidgeting={isFidgeting}
          />
        </SpeakingMouthContext>
      </Canvas>
    </div>
  );
};

interface CharacterPreviewProps {
  characterName: string;
  loadout: CharacterLoadout;
  showOffCount?: number;
  readMouthOpenness?: () => number;
}

const quarterTurn = Math.PI / 2;

const hasCompany = (loadout: CharacterLoadout): boolean => {
  const { pet, mount } = buildShowOffLook(loadout);
  return pet !== undefined || mount !== undefined;
};

export const CharacterPreview = ({
  characterName,
  loadout,
  showOffCount = 0,
  readMouthOpenness,
}: CharacterPreviewProps) => {
  const dragTurnRef = useRef(0);
  return (
    <figure className="character-preview">
      <div role="img" aria-label={describeCharacter(characterName, loadout)}>
        <CharacterStage
          loadout={loadout}
          framing={
            hasCompany(loadout) ? "full-length-with-company" : "full-length"
          }
          isTurnable
          dragTurnRef={dragTurnRef}
          showOffCount={showOffCount}
          readMouthOpenness={readMouthOpenness}
        />
      </div>
      <figcaption>{characterName}</figcaption>
      <button
        type="button"
        className="character-turn"
        onClick={() => {
          dragTurnRef.current += quarterTurn;
        }}
      >
        Turn around
      </button>
    </figure>
  );
};

const listWithoutPet = (loadout: CharacterLoadout): CharacterLoadout =>
  Object.fromEntries(
    Object.entries(loadout).filter(([slot]) => slot !== "pet"),
  );

export const CharacterPortrait = ({
  characterName,
  loadout,
  isPetShown = false,
  isFidgeting = false,
  readMouthOpenness,
}: {
  characterName?: string;
  loadout: CharacterLoadout;
  isPetShown?: boolean;
  isFidgeting?: boolean;
  readMouthOpenness?: () => number;
}) => {
  const dragTurnRef = useRef(0);
  const portraitLoadout = useMemo(
    () => (isPetShown ? loadout : listWithoutPet(loadout)),
    [isPetShown, loadout],
  );
  return (
    <span
      className="character-portrait"
      {...(characterName === undefined
        ? { "aria-hidden": true }
        : {
            role: "img",
            "aria-label": describeCharacter(characterName, portraitLoadout),
          })}
    >
      <CharacterStage
        loadout={portraitLoadout}
        framing={
          isPetShown && loadout.pet !== undefined
            ? "head-and-shoulders-with-pet"
            : "head-and-shoulders"
        }
        isTurnable={false}
        dragTurnRef={dragTurnRef}
        petPlace="shoulder"
        isFidgeting={isFidgeting}
        readMouthOpenness={readMouthOpenness}
      />
    </span>
  );
};

/** Close on the face, so the head fills its circle; a tall hat's crown runs off the top. */
const headShot: Shot = {
  cameraHeight: headHeight + 0.04,
  cameraDistance: 2.25,
  lookAtHeight: headHeight + 0.04,
  fieldOfView: 32,
};

/**
 * Just a Character's head, with its hat, hair and face, and nothing below:
 * no body, outfit, wings, held Item, pet or mount. Its mouth moves with the
 * words while `readMouthOpenness` is set (ADR 0077).
 */
export const CharacterHead = ({
  loadout,
  readMouthOpenness,
}: {
  loadout: CharacterLoadout;
  readMouthOpenness?: () => number;
}) => {
  const look = useMemo(() => buildCharacterLook(loadout), [loadout]);
  return (
    <span className="character-portrait" aria-hidden>
      <div className="character-stage">
        <Canvas
          flat
          dpr={sharpestPixelRatio}
          frameloop={readMouthOpenness === undefined ? "demand" : "always"}
          gl={{ antialias: true, alpha: true }}
          camera={{
            position: [0, headShot.cameraHeight, headShot.cameraDistance],
            fov: headShot.fieldOfView,
          }}
          onCreated={({ camera }) => {
            camera.lookAt(0, headShot.lookAtHeight, 0);
          }}
        >
          <StudioLights />
          <SpeakingMouthContext value={readMouthOpenness}>
            <Head look={look} />
          </SpeakingMouthContext>
        </Canvas>
      </div>
    </span>
  );
};

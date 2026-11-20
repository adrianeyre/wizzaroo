import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  playFireworkSounds,
  type FireworkSoundCue,
  type SoundSettings,
} from "../game-sound.js";

export const starFireworksColours = [
  "#ffd166",
  "#fff1a8",
  "#ff8fab",
  "#9bf6ff",
  "#caffbf",
  "#bdb2ff",
] as const;

interface FireworkRocket {
  launchAtSeconds: number;
  launchX: number;
  burstX: number;
  burstY: number;
  colour: string;
  sparkHeadings: readonly number[];
  sparkSpeed: number;
}

interface ShootingStar {
  launchAtSeconds: number;
  startX: number;
  startY: number;
  heading: number;
  colour: string;
}

export interface StarFireworksShow {
  rockets: readonly FireworkRocket[];
  shootingStars: readonly ShootingStar[];
  durationSeconds: number;
}

export interface StarSpark {
  x: number;
  y: number;
  tailX: number;
  tailY: number;
  size: number;
  opacity: number;
  colour: string;
}

interface Viewport {
  width: number;
  height: number;
}

const rocketCount = 10;
const rocketLaunchGapSeconds = 0.3;
export const rocketRiseSeconds = 0.8;
const sparksPerBurst = 24;
const sparkLifeSeconds = 1.7;
const sparkDrag = 2.2;
const sparkGravity = 0.25;
const sparkTailSeconds = 0.14;
const shootingStarCount = 8;
const shootingStarSpreadSeconds = 3;
const shootingStarLifeSeconds = 1.2;
const shootingStarSpeed = 1.1;
const shootingStarTailSeconds = 0.22;

const pickBetween = (random: () => number, low: number, high: number) =>
  low + random() * (high - low);

const pickColour = (random: () => number): string =>
  starFireworksColours[Math.floor(random() * starFireworksColours.length)] ??
  starFireworksColours[0];

const buildFireworkRocket = (
  random: () => number,
  rocketIndex: number,
): FireworkRocket => {
  const headingOffset = random() * Math.PI * 2;
  return {
    launchAtSeconds:
      rocketIndex * rocketLaunchGapSeconds + pickBetween(random, 0, 0.15),
    launchX: pickBetween(random, 0.15, 0.85),
    burstX: pickBetween(random, 0.12, 0.88),
    burstY: pickBetween(random, 0.15, 0.5),
    colour: pickColour(random),
    sparkHeadings: Array.from(
      { length: sparksPerBurst },
      (_, sparkIndex) =>
        headingOffset +
        (sparkIndex / sparksPerBurst) * Math.PI * 2 +
        pickBetween(random, -0.08, 0.08),
    ),
    sparkSpeed: pickBetween(random, 0.45, 0.75),
  };
};

const buildShootingStar = (random: () => number): ShootingStar => {
  const isHeadingRight = random() < 0.5;
  const dropAngle = pickBetween(random, 0.35, 0.85);
  return {
    launchAtSeconds: pickBetween(random, 0, shootingStarSpreadSeconds),
    startX: isHeadingRight
      ? pickBetween(random, -0.1, 0.5)
      : pickBetween(random, 0.5, 1.1),
    startY: pickBetween(random, -0.05, 0.35),
    heading: isHeadingRight ? dropAngle : Math.PI - dropAngle,
    colour: pickColour(random),
  };
};

export const buildStarFireworksShow = (
  random: () => number,
): StarFireworksShow => {
  const rockets = Array.from({ length: rocketCount }, (_, rocketIndex) =>
    buildFireworkRocket(random, rocketIndex),
  );
  const shootingStars = Array.from({ length: shootingStarCount }, () =>
    buildShootingStar(random),
  );
  const lastRocketEnd = Math.max(
    ...rockets.map(
      (rocket) => rocket.launchAtSeconds + rocketRiseSeconds + sparkLifeSeconds,
    ),
  );
  const lastShootingStarEnd = Math.max(
    ...shootingStars.map(
      (shootingStar) => shootingStar.launchAtSeconds + shootingStarLifeSeconds,
    ),
  );
  return {
    rockets,
    shootingStars,
    durationSeconds: Math.max(lastRocketEnd, lastShootingStarEnd),
  };
};

/**
 * When each sound of the show happens, from the same rockets and shooting
 * stars that are drawn: a whistle as each rocket rises, a bang as it
 * bursts into stars, and a twinkle as each shooting star appears.
 */
export const listFireworkSoundCues = (
  show: StarFireworksShow,
): FireworkSoundCue[] =>
  [
    ...show.rockets.flatMap((rocket): FireworkSoundCue[] => [
      {
        kind: "launch",
        atSeconds: rocket.launchAtSeconds,
        seconds: rocketRiseSeconds,
      },
      {
        kind: "burst",
        atSeconds: rocket.launchAtSeconds + rocketRiseSeconds,
        seconds: sparkLifeSeconds,
      },
    ]),
    ...show.shootingStars.map((shootingStar): FireworkSoundCue => ({
      kind: "shooting-star",
      atSeconds: shootingStar.launchAtSeconds,
      seconds: shootingStarLifeSeconds,
    })),
  ].sort((first, second) => first.atSeconds - second.atSeconds);

const getSparkTravel = (sparkSpeed: number, ageSeconds: number) =>
  (sparkSpeed * (1 - Math.exp(-sparkDrag * ageSeconds))) / sparkDrag;

const getSparkOffset = (
  rocket: FireworkRocket,
  heading: number,
  ageSeconds: number,
  reach: number,
) => {
  const travel = getSparkTravel(rocket.sparkSpeed, ageSeconds) * reach;
  const fall = 0.5 * sparkGravity * ageSeconds * ageSeconds * reach;
  return {
    x: Math.cos(heading) * travel,
    y: Math.sin(heading) * travel + fall,
  };
};

const getRisingRocketPoint = (
  rocket: FireworkRocket,
  riseProgress: number,
  viewport: Viewport,
) => {
  const easedProgress = 1 - (1 - riseProgress) ** 3;
  return {
    x:
      (rocket.launchX + (rocket.burstX - rocket.launchX) * easedProgress) *
      viewport.width,
    y: (1.02 + (rocket.burstY - 1.02) * easedProgress) * viewport.height,
  };
};

const listRocketSparks = (
  rocket: FireworkRocket,
  seconds: number,
  viewport: Viewport,
  reach: number,
): StarSpark[] => {
  const rocketAge = seconds - rocket.launchAtSeconds;
  if (rocketAge < 0) {
    return [];
  }
  if (rocketAge < rocketRiseSeconds) {
    const head = getRisingRocketPoint(
      rocket,
      rocketAge / rocketRiseSeconds,
      viewport,
    );
    const tail = getRisingRocketPoint(
      rocket,
      Math.max(0, rocketAge - sparkTailSeconds) / rocketRiseSeconds,
      viewport,
    );
    return [
      {
        x: head.x,
        y: head.y,
        tailX: tail.x,
        tailY: tail.y,
        size: reach * 0.012,
        opacity: 1,
        colour: rocket.colour,
      },
    ];
  }
  const burstAge = rocketAge - rocketRiseSeconds;
  if (burstAge >= sparkLifeSeconds) {
    return [];
  }
  const burstX = rocket.burstX * viewport.width;
  const burstY = rocket.burstY * viewport.height;
  const lifeProgress = burstAge / sparkLifeSeconds;
  return rocket.sparkHeadings.map((heading) => {
    const head = getSparkOffset(rocket, heading, burstAge, reach);
    const tail = getSparkOffset(
      rocket,
      heading,
      Math.max(0, burstAge - sparkTailSeconds),
      reach,
    );
    return {
      x: burstX + head.x,
      y: burstY + head.y,
      tailX: burstX + tail.x,
      tailY: burstY + tail.y,
      size: reach * 0.016 * (1 - lifeProgress * 0.6),
      opacity: 1 - lifeProgress ** 2,
      colour: rocket.colour,
    };
  });
};

const listShootingStarSparks = (
  shootingStar: ShootingStar,
  seconds: number,
  viewport: Viewport,
  reach: number,
): StarSpark[] => {
  const age = seconds - shootingStar.launchAtSeconds;
  if (age < 0 || age >= shootingStarLifeSeconds) {
    return [];
  }
  const startX = shootingStar.startX * viewport.width;
  const startY = shootingStar.startY * viewport.height;
  const headTravel = age * shootingStarSpeed * reach;
  const tailTravel =
    Math.max(0, age - shootingStarTailSeconds) * shootingStarSpeed * reach;
  const directionX = Math.cos(shootingStar.heading);
  const directionY = Math.sin(shootingStar.heading);
  const lifeProgress = age / shootingStarLifeSeconds;
  return [
    {
      x: startX + directionX * headTravel,
      y: startY + directionY * headTravel,
      tailX: startX + directionX * tailTravel,
      tailY: startY + directionY * tailTravel,
      size: reach * 0.022,
      opacity: 1 - lifeProgress ** 3,
      colour: shootingStar.colour,
    },
  ];
};

export const listStarSparks = (
  show: StarFireworksShow,
  seconds: number,
  viewport: Viewport,
): StarSpark[] => {
  const reach = Math.min(viewport.width, viewport.height);
  return [
    ...show.shootingStars.flatMap((shootingStar) =>
      listShootingStarSparks(shootingStar, seconds, viewport, reach),
    ),
    ...show.rockets.flatMap((rocket) =>
      listRocketSparks(rocket, seconds, viewport, reach),
    ),
  ];
};

const traceStarShape = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
) => {
  const innerRadius = outerRadius * 0.45;
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    context.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  context.closePath();
};

const drawStarSpark = (context: CanvasRenderingContext2D, spark: StarSpark) => {
  context.globalAlpha = spark.opacity;
  const trail = context.createLinearGradient(
    spark.tailX,
    spark.tailY,
    spark.x,
    spark.y,
  );
  trail.addColorStop(0, "transparent");
  trail.addColorStop(1, spark.colour);
  context.strokeStyle = trail;
  context.lineWidth = Math.max(1, spark.size * 0.5);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(spark.tailX, spark.tailY);
  context.lineTo(spark.x, spark.y);
  context.stroke();
  context.fillStyle = spark.colour;
  context.shadowColor = spark.colour;
  context.shadowBlur = spark.size * 1.5;
  traceStarShape(context, spark.x, spark.y, spark.size);
  context.fill();
  context.shadowBlur = 0;
};

const drawStarFireworks = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  show: StarFireworksShow,
  seconds: number,
) => {
  const viewport = { width: canvas.clientWidth, height: canvas.clientHeight };
  const pixelRatio = window.devicePixelRatio;
  const pixelWidth = Math.round(viewport.width * pixelRatio);
  const pixelHeight = Math.round(viewport.height * pixelRatio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, viewport.width, viewport.height);
  context.globalCompositeOperation = "lighter";
  for (const spark of listStarSparks(show, seconds, viewport)) {
    drawStarSpark(context, spark);
  }
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
};

interface StarFireworksProps {
  soundSettings: SoundSettings;
  onFinished: () => void;
}

export const StarFireworks = ({
  soundSettings,
  onFinished,
}: StarFireworksProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFinishedRef = useRef(onFinished);
  // The show and its sounds start once, with the settings it opened with.
  const soundSettingsRef = useRef(soundSettings);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const show = buildStarFireworksShow(Math.random);
    const context = canvas.getContext("2d");
    // The sounds are scheduled on the audio clock from the same show, and
    // the drawing waits as long as they do, so each bang lands on its burst.
    const sounds = playFireworkSounds(
      listFireworkSoundCues(show),
      soundSettingsRef.current,
    );
    const startedAt = performance.now() + sounds.delaySeconds * 1000;
    let frameId = 0;
    const drawFrame = (now: number) => {
      const seconds = (now - startedAt) / 1000;
      if (seconds >= show.durationSeconds) {
        onFinishedRef.current();
        return;
      }
      if (context !== null) {
        drawStarFireworks(canvas, context, show, seconds);
      }
      frameId = requestAnimationFrame(drawFrame);
    };
    frameId = requestAnimationFrame(drawFrame);
    return () => {
      cancelAnimationFrame(frameId);
      sounds.stop();
    };
  }, []);

  return createPortal(
    <canvas ref={canvasRef} className="star-fireworks" aria-hidden="true" />,
    document.body,
  );
};

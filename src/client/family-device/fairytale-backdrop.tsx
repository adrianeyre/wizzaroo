import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

type Placement = readonly [x: number, y: number, scale: number];

const paint = (token: string): CSSProperties => ({
  fill: `var(--fairytale-${token})`,
});

const ink = (token: string): CSSProperties => ({
  stroke: `var(--fairytale-${token})`,
});

const place = (x: number, y: number, scale = 1): string =>
  `translate(${String(x)} ${String(y)}) scale(${String(scale)})`;

const ColourStop = ({
  offset,
  token,
  opacity = 1,
}: {
  offset: string;
  token: string;
  opacity?: number;
}) => (
  <stop
    offset={offset}
    style={{ stopColor: `var(--fairytale-${token})`, stopOpacity: opacity }}
  />
);

const stars: readonly (readonly [x: number, y: number, r: number])[] = [
  [60, 50, 1.8],
  [140, 190, 1.2],
  [250, 40, 2.2],
  [320, 120, 1.2],
  [400, 60, 1.6],
  [480, 140, 1.2],
  [540, 36, 2],
  [610, 100, 1.2],
  [680, 30, 1.6],
  [740, 150, 1.2],
  [880, 40, 1.6],
  [950, 120, 1.2],
  [1010, 60, 2],
  [1080, 30, 1.2],
  [1180, 90, 1.6],
  [1250, 30, 1.2],
  [1300, 200, 1.4],
  [1480, 60, 1.8],
  [1540, 170, 1.2],
  [1580, 40, 1.6],
  [30, 280, 1.2],
  [560, 220, 1.2],
  [1060, 240, 1.2],
];

const twinkles: readonly Placement[] = [
  [360, 200, 0.9],
  [860, 90, 1.1],
  [1220, 140, 0.8],
  [1520, 260, 0.9],
  [90, 120, 0.8],
];

const lanterns: readonly Placement[] = [
  [520, 300, 1],
  [575, 250, 0.8],
  [1010, 300, 0.9],
  [1070, 360, 0.7],
  [1160, 280, 0.8],
  [460, 380, 0.7],
  [640, 210, 0.6],
  [960, 220, 0.6],
];

const fairies: readonly Placement[] = [
  [430, 640, 1],
  [1130, 560, 0.9],
  [1460, 650, 0.8],
];

const pines: readonly Placement[] = [
  [40, 900, 1.5],
  [110, 905, 1.2],
  [1480, 900, 1.45],
  [1550, 905, 1.7],
  [1410, 880, 1],
  [1340, 760, 0.6],
  [1385, 765, 0.7],
  [250, 770, 0.6],
  [205, 775, 0.7],
];

const flowers: readonly (readonly [x: number, y: number, token: string])[] = [
  [180, 870, "flower-pink"],
  [230, 860, "flower-gold"],
  [300, 880, "flower-pink"],
  [360, 872, "flower-blue"],
  [1250, 870, "flower-gold"],
  [1300, 860, "flower-pink"],
  [1360, 876, "flower-blue"],
  [1200, 884, "flower-pink"],
  [560, 868, "flower-gold"],
  [1040, 870, "flower-blue"],
];

const beanstalkLeaves: readonly (readonly [
  x: number,
  y: number,
  angle: number,
])[] = [
  [96, 770, -30],
  [160, 670, 25],
  [108, 545, -35],
  [160, 450, 20],
  [128, 380, -30],
];

const rainbowBands = [
  "rainbow-red",
  "rainbow-orange",
  "rainbow-yellow",
  "rainbow-green",
  "rainbow-blue",
  "rainbow-violet",
] as const;

const sparklePath = "M0 -10 L2 -2 L10 0 L2 2 L0 10 L-2 2 L-10 0 L-2 -2 Z";

const Cloud = ({ at }: { at: Placement }) => (
  <g transform={place(...at)} fill="url(#fairytale-cloud)">
    <circle cx="40" cy="0" r="30" />
    <circle cx="82" cy="-20" r="42" />
    <circle cx="128" cy="-6" r="32" />
    <circle cx="162" cy="6" r="22" />
    <rect x="16" y="0" width="160" height="30" rx="15" />
  </g>
);

const PineTree = ({ at }: { at: Placement }) => (
  <g transform={place(...at)}>
    <rect x="-5" y="-14" width="10" height="16" style={paint("trunk")} />
    <path
      d="M0 -120 L24 -78 L12 -78 L34 -42 L18 -42 L42 -10 L-42 -10 L-18 -42 L-34 -42 L-12 -78 L-24 -78 Z"
      style={paint("pine")}
    />
    <path
      d="M0 -120 L24 -78 L12 -78 L34 -42 L18 -42 L42 -10 L0 -10 Z"
      style={paint("pine-shade")}
    />
  </g>
);

const MushroomHouse = ({ at }: { at: Placement }) => (
  <g transform={place(...at)}>
    <path
      d="M-28 0 L-23 -62 Q0 -70 23 -62 L28 0 Z"
      fill="url(#fairytale-stem)"
    />
    <path
      d="M-64 -56 C-64 -126 64 -126 64 -56 C32 -46 -32 -46 -64 -56 Z"
      fill="url(#fairytale-cap)"
    />
    <g style={paint("cap-spot")}>
      <circle cx="-30" cy="-86" r="9" />
      <circle cx="6" cy="-102" r="7" />
      <circle cx="34" cy="-80" r="7" />
      <circle cx="-6" cy="-72" r="5" />
      <circle cx="-48" cy="-64" r="4" />
    </g>
    <path
      d="M-10 0 L-10 -20 A10 10 0 0 1 10 -20 L10 0 Z"
      style={paint("door")}
    />
    <g filter="url(#fairytale-glow)" style={paint("window")}>
      <circle cx="15" cy="-36" r="6" />
    </g>
  </g>
);

const Lantern = ({ at }: { at: Placement }) => (
  <g transform={place(...at)}>
    <circle r="16" fill="url(#fairytale-lantern-halo)" />
    <path d="M-6 -9 L6 -9 L5 8 L-5 8 Z" style={paint("lantern")} />
    <rect x="-4" y="-2" width="8" height="7" rx="2" style={paint("window")} />
  </g>
);

const Fairy = ({ at }: { at: Placement }) => (
  <g transform={place(...at)}>
    <path
      d="M-90 30 C-60 40 -40 10 -14 6"
      fill="none"
      strokeWidth="2"
      strokeDasharray="1 7"
      strokeLinecap="round"
      style={ink("fairy-trail")}
    />
    <ellipse
      cx="-6"
      cy="-8"
      rx="9"
      ry="5"
      transform="rotate(-35 -6 -8)"
      style={paint("fairy-wing")}
    />
    <ellipse
      cx="6"
      cy="-8"
      rx="9"
      ry="5"
      transform="rotate(35 6 -8)"
      style={paint("fairy-wing")}
    />
    <circle r="12" fill="url(#fairytale-fairy-halo)" />
    <circle r="3.5" style={paint("fairy")} />
  </g>
);

interface TowerProps {
  x: number;
  top: number;
  width: number;
  roofHeight: number;
  base: number;
  flagToken?: string;
  windows?: readonly number[];
}

const Tower = ({
  x,
  top,
  width,
  roofHeight,
  base,
  flagToken,
  windows = [],
}: TowerProps) => {
  const centre = x + width / 2;
  const eave = 6;
  const apex = top - roofHeight;
  const roofLeft = String(x - eave);
  const roofRight = String(x + width + eave);
  const roofFoot = String(top + 4);
  return (
    <g>
      <rect
        x={x}
        y={top}
        width={width}
        height={base - top}
        fill="url(#fairytale-stone)"
      />
      <rect
        x={x - 3}
        y={top}
        width={width + 6}
        height="8"
        style={paint("castle-trim")}
      />
      <path
        d={`M${roofLeft} ${roofFoot} L${String(centre)} ${String(apex)} L${roofRight} ${roofFoot} Z`}
        fill="url(#fairytale-roof)"
      />
      <path
        d={`M${String(centre)} ${String(apex)} L${roofRight} ${roofFoot} L${String(centre)} ${roofFoot} Z`}
        style={paint("roof-shade")}
      />
      {flagToken === undefined ? null : (
        <g>
          <rect
            x={centre - 1}
            y={apex - 30}
            width="2"
            height="30"
            style={paint("castle-trim")}
          />
          <path
            d={`M${String(centre + 1)} ${String(apex - 30)} L${String(centre + 26)} ${String(apex - 23)} L${String(centre + 1)} ${String(apex - 16)} Z`}
            style={paint(flagToken)}
          />
        </g>
      )}
      <g filter="url(#fairytale-glow)" style={paint("window")}>
        {windows.map((windowTop) => (
          <path
            key={windowTop}
            d={`M${String(centre - 6)} ${String(windowTop + 18)} L${String(centre - 6)} ${String(windowTop + 6)} A6 6 0 0 1 ${String(centre + 6)} ${String(windowTop + 6)} L${String(centre + 6)} ${String(windowTop + 18)} Z`}
          />
        ))}
      </g>
    </g>
  );
};

const buildCrenellations = (
  left: number,
  right: number,
  top: number,
): ReactNode =>
  Array.from({ length: Math.floor((right - left) / 24) }, (_, index) => (
    <rect
      key={index}
      x={left + index * 24}
      y={top - 12}
      width="14"
      height="14"
      fill="url(#fairytale-stone)"
    />
  ));

const Castle = () => (
  <g>
    <ellipse
      cx="800"
      cy="420"
      rx="300"
      ry="300"
      fill="url(#fairytale-castle-halo)"
    />
    <g fill="none" strokeLinecap="round" style={ink("ring")}>
      <ellipse
        cx="800"
        cy="300"
        rx="150"
        ry="26"
        strokeWidth="3"
        strokeDasharray="200 30 60 30"
      />
      <ellipse
        cx="800"
        cy="300"
        rx="196"
        ry="36"
        strokeWidth="2"
        strokeDasharray="4 12"
        opacity="0.6"
      />
    </g>
    <rect
      x="560"
      y="600"
      width="480"
      height="180"
      fill="url(#fairytale-stone)"
    />
    <Tower
      x={596}
      top={470}
      width={56}
      roofHeight={92}
      base={780}
      windows={[520, 580]}
    />
    <Tower
      x={948}
      top={470}
      width={56}
      roofHeight={92}
      base={780}
      windows={[520, 580]}
    />
    <path d="M788 250 L800 170 L812 250 Z" style={paint("roof")} />
    <path d="M800 170 L812 250 L800 250 Z" style={paint("roof-shade")} />
    <Tower
      x={732}
      top={370}
      width={136}
      roofHeight={130}
      base={780}
      flagToken="flag-gold"
      windows={[410, 470, 530]}
    />
    <circle cx="800" cy="164" r="20" fill="url(#fairytale-orb-halo)" />
    <circle cx="800" cy="164" r="5" style={paint("orb")} />
    <Tower
      x={656}
      top={430}
      width={68}
      roofHeight={112}
      base={780}
      flagToken="flag-rose"
      windows={[470, 540]}
    />
    <Tower
      x={876}
      top={430}
      width={68}
      roofHeight={112}
      base={780}
      flagToken="flag-teal"
      windows={[470, 540]}
    />
    <path
      d="M650 300 A150 26 0 0 0 950 300"
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      style={ink("ring")}
    />
    <rect
      x="610"
      y="640"
      width="380"
      height="140"
      fill="url(#fairytale-stone)"
    />
    {buildCrenellations(610, 990, 640)}
    <rect x="610" y="640" width="380" height="6" style={paint("castle-trim")} />
    <path
      d="M640 652 L664 652 L664 712 L652 702 L640 712 Z"
      style={paint("flag-rose")}
    />
    <path
      d="M936 652 L960 652 L960 712 L948 702 L936 712 Z"
      style={paint("flag-teal")}
    />
    <Tower
      x={694}
      top={570}
      width={50}
      roofHeight={70}
      base={780}
      windows={[610]}
    />
    <Tower
      x={856}
      top={570}
      width={50}
      roofHeight={70}
      base={780}
      windows={[610]}
    />
    <path
      d="M762 780 L762 712 A38 38 0 0 1 838 712 L838 780 Z"
      fill="url(#fairytale-gate)"
    />
    <g strokeWidth="3" style={ink("gate-bars")}>
      {[774, 788, 800, 812, 826].map((barX) => (
        <line key={barX} x1={barX} y1={690} x2={barX} y2={780} />
      ))}
      <line x1="764" y1="726" x2="836" y2="726" />
      <line x1="764" y1="752" x2="836" y2="752" />
    </g>
    <path
      d="M762 780 L762 712 A38 38 0 0 1 838 712 L838 780"
      fill="none"
      strokeWidth="6"
      style={ink("castle-trim")}
    />
  </g>
);

const islandRock =
  "M-112 0 C-92 34 -62 62 -32 100 L0 150 L22 100 C54 62 92 32 112 0 Z";

const WizardIsland = () => (
  <g transform={place(300, 360)}>
    <ellipse
      cx="0"
      cy="200"
      rx="70"
      ry="10"
      fill="url(#fairytale-hover-glow)"
    />
    <path
      d="M88 6 L104 6 L110 236 L82 236 Z"
      fill="url(#fairytale-waterfall)"
    />
    <path d={islandRock} fill="url(#fairytale-rock)" />
    <g filter="url(#fairytale-glow)" style={paint("crystal")}>
      <path d="M-14 112 L-6 92 L2 112 L-6 140 Z" />
      <path d="M8 104 L14 88 L20 104 L14 124 Z" />
      <path d="M-34 92 L-29 80 L-24 92 L-29 106 Z" />
    </g>
    <ellipse cx="0" cy="0" rx="114" ry="14" style={paint("island-grass")} />
    <rect
      x="-20"
      y="-120"
      width="40"
      height="120"
      fill="url(#fairytale-stone)"
    />
    <path d="M-30 -116 L0 -196 L30 -116 Z" fill="url(#fairytale-roof)" />
    <path d="M0 -196 L30 -116 L0 -116 Z" style={paint("roof-shade")} />
    <path
      d={sparklePath}
      transform={place(0, -206, 1.1)}
      style={paint("star")}
    />
    <g filter="url(#fairytale-glow)" style={paint("window")}>
      <path d="M-6 -60 L-6 -76 A6 6 0 0 1 6 -76 L6 -60 Z" />
      <circle cx="0" cy="-98" r="4" />
    </g>
    <PineTree at={[-70, -4, 0.45]} />
    <PineTree at={[64, -4, 0.38]} />
  </g>
);

const CottageIsland = () => (
  <g transform={place(1280, 440, 0.78)}>
    <ellipse cx="0" cy="190" rx="60" ry="9" fill="url(#fairytale-hover-glow)" />
    <path d={islandRock} fill="url(#fairytale-rock)" />
    <g filter="url(#fairytale-glow)" style={paint("crystal")}>
      <path d="M-4 116 L4 94 L12 116 L4 142 Z" />
      <path d="M-24 98 L-18 84 L-12 98 L-18 114 Z" />
    </g>
    <ellipse cx="0" cy="0" rx="114" ry="14" style={paint("island-grass")} />
    <rect x="-12" y="-64" width="10" height="26" style={paint("castle-trim")} />
    <rect x="-34" y="-44" width="68" height="44" style={paint("cottage")} />
    <path d="M-44 -40 L0 -78 L44 -40 Z" style={paint("cottage-roof")} />
    <path d="M-8 0 L-8 -18 A8 8 0 0 1 8 -18 L8 0 Z" style={paint("door")} />
    <g filter="url(#fairytale-glow)" style={paint("window")}>
      <rect x="16" y="-30" width="10" height="10" rx="2" />
      <rect x="-26" y="-30" width="10" height="10" rx="2" />
    </g>
    <rect x="66" y="-40" width="8" height="40" style={paint("trunk")} />
    <g style={paint("tree-leaf")}>
      <circle cx="70" cy="-60" r="26" />
      <circle cx="52" cy="-44" r="18" />
      <circle cx="88" cy="-44" r="18" />
    </g>
    <g filter="url(#fairytale-glow)" style={paint("fruit")}>
      <circle cx="62" cy="-62" r="4" />
      <circle cx="82" cy="-50" r="4" />
      <circle cx="70" cy="-40" r="3.5" />
    </g>
  </g>
);

const Airship = () => (
  <g transform={place(1110, 170, 0.9)}>
    <path
      d="M70 -8 L104 -34 L98 0 L104 30 L70 8 Z"
      style={paint("airship-fin")}
    />
    <ellipse cx="0" cy="0" rx="86" ry="30" fill="url(#fairytale-airship)" />
    <g fill="none" strokeWidth="3" style={ink("airship-band")}>
      <path d="M-80 -6 C-40 -18 40 -18 82 -6" />
      <path d="M-80 8 C-40 20 40 20 82 8" />
    </g>
    <g strokeWidth="1.5" style={ink("castle-trim")}>
      <line x1="-30" y1="26" x2="-22" y2="44" />
      <line x1="30" y1="26" x2="22" y2="44" />
    </g>
    <rect
      x="-30"
      y="42"
      width="60"
      height="18"
      rx="8"
      style={paint("gondola")}
    />
    <g filter="url(#fairytale-glow)" style={paint("window")}>
      <circle cx="-14" cy="51" r="3.5" />
      <circle cx="0" cy="51" r="3.5" />
      <circle cx="14" cy="51" r="3.5" />
    </g>
    <ellipse cx="-38" cy="51" rx="3" ry="11" style={paint("castle-trim")} />
  </g>
);

const HotAirBalloon = () => (
  <g transform={place(440, 150, 0.95)}>
    <path
      d="M0 -54 C36 -54 44 -18 24 10 L9 30 L-9 30 L-24 10 C-44 -18 -36 -54 0 -54 Z"
      style={paint("balloon-rose")}
    />
    <path
      d="M0 -54 C14 -54 16 -18 9 10 L4 30 L-4 30 L-9 10 C-16 -18 -14 -54 0 -54 Z"
      style={paint("balloon-gold")}
    />
    <path
      d="M24 10 L9 30 L4 30 L9 10 C16 -18 14 -54 0 -54 C36 -54 44 -18 24 10 Z"
      style={paint("balloon-shade")}
    />
    <g strokeWidth="1.2" style={ink("castle-trim")}>
      <line x1="-9" y1="30" x2="-7" y2="42" />
      <line x1="9" y1="30" x2="7" y2="42" />
    </g>
    <rect x="-8" y="42" width="16" height="12" rx="2" style={paint("basket")} />
  </g>
);

const Dragon = () => (
  <g transform={place(1380, 330, 0.85)}>
    <path
      d="M44 -6 C54 -54 86 -86 128 -104 C116 -76 118 -54 126 -32 C108 -44 96 -32 90 -12 C78 -26 64 -22 58 -6 Z"
      style={paint("dragon-wing")}
    />
    <path
      d="M0 0 C20 -14 50 -16 80 -8 C110 0 132 4 160 -6 C172 -10 180 -18 186 -28 L196 -24 L186 -16 C176 -2 160 8 140 12 C110 20 80 16 50 14 C30 13 14 10 0 0 Z"
      style={paint("dragon")}
    />
    <path
      d="M0 0 C-10 -8 -24 -12 -36 -10 L-50 -4 L-38 0 L-48 6 L-30 8 C-18 10 -8 6 0 0 Z"
      style={paint("dragon")}
    />
    <path d="M-26 -11 L-20 -26 L-15 -10 Z" style={paint("dragon-wing")} />
    <path
      d="M60 -4 C70 -36 92 -58 118 -72 C108 -54 108 -40 114 -26 C98 -34 90 -24 86 -10 Z"
      style={paint("dragon-wing-shade")}
    />
    <g style={paint("dragon")}>
      <path d="M60 14 L54 30 L64 30 L68 15 Z" />
      <path d="M104 15 L100 30 L110 30 L112 14 Z" />
    </g>
    <circle cx="-30" cy="-4" r="2" style={paint("window")} />
  </g>
);

const PumpkinCarriage = () => (
  <g transform={place(1080, 820, 0.8)}>
    <ellipse cx="0" cy="-50" rx="52" ry="40" fill="url(#fairytale-pumpkin)" />
    <g fill="none" strokeWidth="2.5" style={ink("pumpkin-ridge")}>
      <ellipse cx="0" cy="-50" rx="30" ry="40" />
      <ellipse cx="0" cy="-50" rx="12" ry="40" />
    </g>
    <path
      d="M-2 -88 C-4 -100 4 -106 12 -104 L8 -96 C4 -96 2 -92 2 -88 Z"
      style={paint("pumpkin-stem")}
    />
    <g filter="url(#fairytale-glow)" style={paint("window")}>
      <path d="M-12 -34 L-12 -52 A12 12 0 0 1 12 -52 L12 -34 Z" />
    </g>
    <g fill="none" strokeWidth="4" style={ink("wheel")}>
      <circle cx="-34" cy="-8" r="15" />
      <circle cx="34" cy="-8" r="15" />
    </g>
    <g strokeWidth="2" style={ink("wheel")}>
      <line x1="-49" y1="-8" x2="-19" y2="-8" />
      <line x1="-34" y1="-23" x2="-34" y2="7" />
      <line x1="19" y1="-8" x2="49" y2="-8" />
      <line x1="34" y1="-23" x2="34" y2="7" />
    </g>
  </g>
);

const LanternTree = () => (
  <g transform={place(490, 850)}>
    <path
      d="M-10 0 C-6 -40 -18 -70 -4 -110 C2 -128 -14 -150 -30 -160 M-6 -104 C14 -126 34 -132 52 -150"
      fill="none"
      strokeWidth="14"
      strokeLinecap="round"
      style={ink("trunk")}
    />
    <g style={paint("magic-leaf")}>
      <circle cx="-34" cy="-176" r="38" />
      <circle cx="10" cy="-196" r="44" />
      <circle cx="56" cy="-168" r="36" />
      <circle cx="-60" cy="-148" r="24" />
      <circle cx="80" cy="-140" r="22" />
    </g>
    <g style={paint("magic-leaf-light")}>
      <circle cx="-20" cy="-196" r="18" />
      <circle cx="24" cy="-214" r="20" />
    </g>
    <g filter="url(#fairytale-glow)" style={paint("fruit")}>
      <circle cx="-50" cy="-130" r="4" />
      <circle cx="-14" cy="-150" r="4" />
      <circle cx="30" cy="-160" r="4" />
      <circle cx="70" cy="-126" r="4" />
      <circle cx="4" cy="-180" r="3.5" />
      <circle cx="46" cy="-196" r="3.5" />
    </g>
  </g>
);

const Beanstalk = () => (
  <g>
    <path
      d="M120 900 C70 780 180 700 130 600 C90 520 170 440 140 360 C126 320 150 290 170 270"
      fill="none"
      strokeWidth="16"
      strokeLinecap="round"
      style={ink("beanstalk")}
    />
    <path
      d="M120 900 C70 780 180 700 130 600 C90 520 170 440 140 360"
      fill="none"
      strokeWidth="5"
      strokeLinecap="round"
      style={ink("beanstalk-light")}
    />
    <g style={paint("beanstalk")}>
      {beanstalkLeaves.map(([x, y, angle]) => (
        <path
          key={y}
          d="M0 0 C10 -16 34 -18 46 -4 C34 8 12 10 0 0 Z"
          transform={`translate(${String(x)} ${String(y)}) rotate(${String(angle)})`}
        />
      ))}
    </g>
    <Cloud at={[70, 260, 1]} />
    <g transform={place(150, 236, 0.5)} style={paint("cloud-castle")}>
      <rect x="-50" y="-30" width="100" height="40" />
      <rect x="-60" y="-70" width="24" height="80" />
      <rect x="36" y="-70" width="24" height="80" />
      <rect x="-14" y="-96" width="28" height="106" />
      <path d="M-66 -66 L-48 -100 L-30 -66 Z" />
      <path d="M30 -66 L48 -100 L66 -66 Z" />
      <path d="M-20 -92 L0 -134 L20 -92 Z" />
    </g>
  </g>
);

const RingedPlanet = () => (
  <g transform={place(200, 110)}>
    <path
      d="M-62 8 A64 16 0 0 1 62 -8"
      fill="none"
      strokeWidth="5"
      transform="rotate(-18)"
      style={ink("planet-ring")}
    />
    <circle r="32" fill="url(#fairytale-planet)" />
    <path
      d="M62 -8 A64 16 0 0 1 -62 8"
      fill="none"
      strokeWidth="5"
      transform="rotate(-18)"
      style={ink("planet-ring")}
    />
  </g>
);

const Moon = () => (
  <g>
    <circle cx="1400" cy="120" r="110" fill="url(#fairytale-moon-halo)" />
    <circle
      cx="1400"
      cy="120"
      r="48"
      mask="url(#fairytale-crescent)"
      style={paint("moon")}
    />
  </g>
);

const Rainbow = () => (
  <g
    fill="none"
    strokeWidth="12"
    style={{ opacity: "var(--fairytale-rainbow-opacity)" }}
  >
    {rainbowBands.map((token, index) => (
      <circle
        key={token}
        cx="420"
        cy="700"
        r={360 - index * 12}
        style={ink(token)}
      />
    ))}
  </g>
);

const RiverAndPath = () => (
  <g>
    <path
      d="M770 780 C700 820 640 840 600 900 L760 900 C780 850 820 820 830 780 Z"
      fill="url(#fairytale-path)"
    />
    <path
      d="M1040 780 C1120 800 1180 820 1200 860 C1214 884 1260 896 1320 900 L1180 900 C1140 880 1110 850 1060 830 C1010 812 990 800 1000 780 Z"
      fill="url(#fairytale-river)"
    />
    <g strokeWidth="2" strokeLinecap="round" style={ink("river-light")}>
      <line x1="1060" y1="808" x2="1090" y2="812" />
      <line x1="1140" y1="840" x2="1176" y2="852" />
      <line x1="1200" y1="882" x2="1240" y2="890" />
    </g>
  </g>
);

const Mountains = () => (
  <g>
    <path
      d="M0 640 L120 520 L210 590 L330 470 L450 600 L560 540 L640 610 L760 560 L880 620 L980 530 L1100 600 L1230 480 L1350 590 L1460 520 L1600 610 L1600 900 L0 900 Z"
      fill="url(#fairytale-mountain)"
    />
    <g style={paint("snow")}>
      <path d="M330 470 L352 495 L340 492 L330 504 L318 494 L308 496 Z" />
      <path d="M1230 480 L1252 505 L1240 502 L1230 514 L1218 504 L1208 506 Z" />
      <path d="M120 520 L138 540 L126 538 L118 548 L108 540 L102 538 Z" />
      <path d="M980 530 L998 550 L988 548 L980 558 L970 550 L962 552 Z" />
    </g>
    <path
      d="M0 700 C160 650 330 670 470 700 C620 730 700 680 820 690 C960 700 1060 650 1220 670 C1380 690 1480 650 1600 670 L1600 900 L0 900 Z"
      fill="url(#fairytale-hill-far)"
    />
  </g>
);

const Foreground = () => (
  <g>
    <path
      d="M0 780 C120 760 260 790 380 830 C470 860 540 880 600 900 L0 900 Z"
      fill="url(#fairytale-hill-near)"
    />
    <path
      d="M980 900 C1080 850 1230 800 1400 790 C1500 786 1570 800 1600 810 L1600 900 Z"
      fill="url(#fairytale-hill-near)"
    />
    <path
      d="M560 900 C640 860 720 846 800 846 C880 846 960 860 1040 900 Z"
      fill="url(#fairytale-hill-mid)"
    />
  </g>
);

const Gradients = () => (
  <defs>
    <linearGradient id="fairytale-sky" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="sky-top" />
      <ColourStop offset="0.55" token="sky-middle" />
      <ColourStop offset="1" token="sky-horizon" />
    </linearGradient>
    <radialGradient id="fairytale-aurora-teal">
      <ColourStop offset="0" token="aurora-teal" opacity={0.55} />
      <ColourStop offset="1" token="aurora-teal" opacity={0} />
    </radialGradient>
    <radialGradient id="fairytale-aurora-rose">
      <ColourStop offset="0" token="aurora-rose" opacity={0.5} />
      <ColourStop offset="1" token="aurora-rose" opacity={0} />
    </radialGradient>
    <radialGradient id="fairytale-moon-halo">
      <ColourStop offset="0" token="moon" opacity={0.45} />
      <ColourStop offset="1" token="moon" opacity={0} />
    </radialGradient>
    <radialGradient id="fairytale-castle-halo">
      <ColourStop offset="0" token="aurora-teal" opacity={0.35} />
      <ColourStop offset="1" token="aurora-teal" opacity={0} />
    </radialGradient>
    <radialGradient id="fairytale-orb-halo">
      <ColourStop offset="0" token="orb" opacity={0.9} />
      <ColourStop offset="1" token="orb" opacity={0} />
    </radialGradient>
    <radialGradient id="fairytale-lantern-halo">
      <ColourStop offset="0" token="window" opacity={0.7} />
      <ColourStop offset="1" token="window" opacity={0} />
    </radialGradient>
    <radialGradient id="fairytale-fairy-halo">
      <ColourStop offset="0" token="fairy" opacity={0.8} />
      <ColourStop offset="1" token="fairy" opacity={0} />
    </radialGradient>
    <radialGradient id="fairytale-hover-glow">
      <ColourStop offset="0" token="crystal" opacity={0.7} />
      <ColourStop offset="1" token="crystal" opacity={0} />
    </radialGradient>
    <radialGradient id="fairytale-planet" cx="0.35" cy="0.3" r="0.8">
      <ColourStop offset="0" token="planet-light" />
      <ColourStop offset="1" token="planet-dark" />
    </radialGradient>
    <radialGradient id="fairytale-pumpkin" cx="0.4" cy="0.35" r="0.7">
      <ColourStop offset="0" token="pumpkin-light" />
      <ColourStop offset="1" token="pumpkin" />
    </radialGradient>
    <radialGradient id="fairytale-gate" cx="0.5" cy="0.4" r="0.7">
      <ColourStop offset="0" token="window" />
      <ColourStop offset="1" token="gate" />
    </radialGradient>
    <linearGradient id="fairytale-cloud" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="cloud-light" />
      <ColourStop offset="1" token="cloud-shade" />
    </linearGradient>
    <linearGradient id="fairytale-stone" x1="0" y1="0" x2="1" y2="0">
      <ColourStop offset="0" token="stone-light" />
      <ColourStop offset="0.55" token="stone-light" />
      <ColourStop offset="0.56" token="stone-shade" />
      <ColourStop offset="1" token="stone-shade" />
    </linearGradient>
    <linearGradient id="fairytale-roof" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="roof-light" />
      <ColourStop offset="1" token="roof" />
    </linearGradient>
    <linearGradient id="fairytale-rock" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="rock-light" />
      <ColourStop offset="1" token="rock-dark" />
    </linearGradient>
    <linearGradient id="fairytale-waterfall" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="water" opacity={0.9} />
      <ColourStop offset="1" token="water" opacity={0} />
    </linearGradient>
    <linearGradient id="fairytale-airship" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="airship-light" />
      <ColourStop offset="1" token="airship" />
    </linearGradient>
    <linearGradient id="fairytale-stem" x1="0" y1="0" x2="1" y2="0">
      <ColourStop offset="0" token="stem-light" />
      <ColourStop offset="1" token="stem-shade" />
    </linearGradient>
    <linearGradient id="fairytale-cap" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="cap-light" />
      <ColourStop offset="1" token="cap" />
    </linearGradient>
    <linearGradient id="fairytale-mountain" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="mountain-top" />
      <ColourStop offset="1" token="mountain-base" />
    </linearGradient>
    <linearGradient id="fairytale-hill-far" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="hill-far-top" />
      <ColourStop offset="1" token="hill-far-base" />
    </linearGradient>
    <linearGradient id="fairytale-hill-mid" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="hill-mid-top" />
      <ColourStop offset="1" token="hill-mid-base" />
    </linearGradient>
    <linearGradient id="fairytale-hill-near" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="hill-near-top" />
      <ColourStop offset="1" token="hill-near-base" />
    </linearGradient>
    <linearGradient id="fairytale-path" x1="0" y1="0" x2="0" y2="1">
      <ColourStop offset="0" token="path-far" />
      <ColourStop offset="1" token="path-near" />
    </linearGradient>
    <linearGradient id="fairytale-river" x1="0" y1="0" x2="1" y2="1">
      <ColourStop offset="0" token="river-far" />
      <ColourStop offset="1" token="river-near" />
    </linearGradient>
    <linearGradient id="fairytale-shooting-star" x1="0" y1="0" x2="1" y2="0">
      <ColourStop offset="0" token="star" opacity={0} />
      <ColourStop offset="1" token="star" />
    </linearGradient>
    <filter id="fairytale-glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <mask id="fairytale-crescent">
      <circle cx="1400" cy="120" r="48" fill="#fff" />
      <circle cx="1424" cy="104" r="44" fill="#000" />
    </mask>
  </defs>
);

/** The picture's own shape, 16 by 9. */
const pictureAspect = 1600 / 900;

/**
 * Whether the space is wider than the picture. Filling it would then crop
 * the picture's sky, moon and planet off the top, so the whole picture is
 * shown instead, its sides fading into a sky-to-hills fill behind it.
 */
const useIsWiderThanPicture = () => {
  const backdrop = useRef<SVGSVGElement>(null);
  const [isWider, setIsWider] = useState(false);
  useLayoutEffect(() => {
    const space = backdrop.current?.parentElement;
    if (space === null || space === undefined) {
      return;
    }
    const measure = () => {
      const { width, height } = space.getBoundingClientRect();
      setIsWider(height > 0 && width / height > pictureAspect);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(space);
    return () => {
      observer.disconnect();
    };
  }, []);
  return { backdrop, isWider };
};

/**
 * The fairytale world behind Who's playing and the Picture Password: on a
 * screen taller than 16 by 9 it fills the space, keeping the whole sky and
 * trimming the sides; on a wider one it shows the whole picture.
 */
export const FairytaleBackdrop = () => {
  const { backdrop, isWider } = useIsWiderThanPicture();
  return (
    <FairytalePicture backdrop={backdrop} fit={isWider ? "whole" : "fill"} />
  );
};

const FairytalePicture = ({
  backdrop,
  fit,
}: {
  backdrop: RefObject<SVGSVGElement | null>;
  fit: "whole" | "fill";
}) => (
  <svg
    ref={backdrop}
    className="fairytale-backdrop"
    data-fit={fit}
    viewBox="0 0 1600 900"
    preserveAspectRatio="xMidYMax slice"
    aria-hidden="true"
    focusable="false"
  >
    <Gradients />
    <rect width="1600" height="900" fill="url(#fairytale-sky)" />
    <ellipse
      cx="420"
      cy="200"
      rx="520"
      ry="150"
      fill="url(#fairytale-aurora-teal)"
      transform="rotate(-8 420 200)"
    />
    <ellipse
      cx="1160"
      cy="240"
      rx="480"
      ry="140"
      fill="url(#fairytale-aurora-rose)"
      transform="rotate(10 1160 240)"
    />

    <g style={paint("star")}>
      {stars.map(([x, y, r]) => (
        <circle key={[x, y].join("-")} cx={x} cy={y} r={r} />
      ))}
    </g>
    {twinkles.map((at) => (
      <path
        key={at.join("-")}
        d={sparklePath}
        transform={place(...at)}
        style={paint("star")}
      />
    ))}
    <path
      d="M900 60 L1020 100"
      stroke="url(#fairytale-shooting-star)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <RingedPlanet />
    <Moon />

    <Rainbow />
    <Cloud at={[900, 380, 0.9]} />
    <Cloud at={[1420, 400, 0.7]} />
    <Mountains />
    <Cloud at={[560, 560, 0.8]} />

    <g
      fill="none"
      strokeWidth="3"
      strokeDasharray="10 12"
      strokeLinecap="round"
      style={ink("ring")}
    >
      <path d="M410 340 Q560 280 660 470" />
      <path d="M1192 420 Q1100 340 944 470" />
    </g>
    <WizardIsland />
    <CottageIsland />
    <Castle />

    <HotAirBalloon />
    <Airship />
    <Dragon />
    {lanterns.map((at) => (
      <Lantern key={at.join("-")} at={at} />
    ))}

    <RiverAndPath />
    <Foreground />
    <LanternTree />
    <MushroomHouse at={[290, 862, 0.9]} />
    <MushroomHouse at={[392, 880, 0.6]} />
    <MushroomHouse at={[1240, 846, 0.7]} />
    <PumpkinCarriage />
    {pines.map((at) => (
      <PineTree key={at.join("-")} at={at} />
    ))}
    <Beanstalk />
    {flowers.map(([x, y, token]) => (
      <g key={[x, y].join("-")} transform={place(x, y)} style={paint(token)}>
        <circle cx="-4" cy="0" r="3.5" />
        <circle cx="4" cy="0" r="3.5" />
        <circle cx="0" cy="-4" r="3.5" />
        <circle cx="0" cy="4" r="3.5" />
        <circle r="2.5" style={paint("flower-centre")} />
      </g>
    ))}
    {fairies.map((at) => (
      <Fairy key={at.join("-")} at={at} />
    ))}
  </svg>
);

import type { ReactNode } from "react";
import type { TransportChoice } from "./transport-choice.js";

const TransportIcon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

const waves = "M2 21c1.5 0 2.5-1 4-1s2.5 1 4 1 2.5-1 4-1 2.5 1 4 1 2.5-1 4-1";

// A small line drawing of each craft for the Menu's Transport panel, drawn to
// match the Menu's other icons.
export const transportIcons: Record<TransportChoice, ReactNode> = {
  random: (
    <TransportIcon>
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
      <path d="m18 14 4 4-4 4" />
    </TransportIcon>
  ),
  ship: (
    <TransportIcon>
      <path d="M3 15h18l-2.5 4h-13z" />
      <path d="M6 15v-4h9v4" />
      <path d="M9 11V7h3v4" />
      <path d="M17 15v-6" />
      <path d={waves} />
    </TransportIcon>
  ),
  aeroplane: (
    <TransportIcon>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </TransportIcon>
  ),
  helicopter: (
    <TransportIcon>
      <path d="M3 4h14" />
      <path d="M10 4v3" />
      <path d="M5 13a5 5 0 0 1 5-6h2a5 5 0 0 1 0 10h-3a4 4 0 0 1-4-4z" />
      <path d="M17 12h5l1-2" />
      <path d="M7 20h8M9 17v3M13 17v3" />
    </TransportIcon>
  ),
  hovercraft: (
    <TransportIcon>
      <path d="M3 15c0-2 1.5-3 3.5-3h11c2 0 3.5 1 3.5 3s-1.5 2-3.5 2h-11C4.5 17 3 17 3 15z" />
      <path d="M7 12V9h8l2 3" />
      <path d="M18 9V6M16 6h4" />
      <path d={waves} />
    </TransportIcon>
  ),
  submarine: (
    <TransportIcon>
      <path d="M3 14c0-2.2 2.7-4 6-4h7c2.8 0 5 1.8 5 4s-2.2 4-5 4H9c-3.3 0-6-1.8-6-4z" />
      <path d="M10 10V7h4v3" />
      <path d="M12 7V4h2" />
      <circle cx="9" cy="14" r="1" />
      <circle cx="13" cy="14" r="1" />
      <path d="M3 14H1M2 12v4" />
    </TransportIcon>
  ),
  balloon: (
    <TransportIcon>
      <path d="M12 2a7 7 0 0 0-7 7c0 3.5 3 6 5 8h4c2-2 5-4.5 5-8a7 7 0 0 0-7-7z" />
      <path d="M12 2c-2 2-2.5 4.5-2.5 7s1 5.5 1.5 8M12 2c2 2 2.5 4.5 2.5 7s-1 5.5-1.5 8" />
      <path d="M10 17v2M14 17v2" />
      <rect x="9.5" y="19" width="5" height="3" rx="0.5" />
    </TransportIcon>
  ),
  pirateShip: (
    <TransportIcon>
      <path d="M3 15h18l-3 4H6z" />
      <path d="M12 15V3" />
      <path d="M12 4c3 1 5 3 6 7h-6" />
      <path d="M12 6c-2 1-4 3-5 6h5" />
      <path d="M12 3h3v2h-3" />
      <path d={waves} />
    </TransportIcon>
  ),
  jetski: (
    <TransportIcon>
      <path d="M2 16h16c2.5 0 4-1 4-2.5L19 12H9l-3-2H4z" />
      <path d="M12 12l2-4h3" />
      <path d="M7 10V8" />
      <path d={waves} />
    </TransportIcon>
  ),
  rocket: (
    <TransportIcon>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </TransportIcon>
  ),
  portal: (
    <TransportIcon>
      <ellipse cx="12" cy="12" rx="7" ry="9" />
      <ellipse cx="12" cy="12" rx="3.5" ry="5" />
      <path d="M20 3l.5 1.5L22 5l-1.5.5L20 7l-.5-1.5L18 5l1.5-.5z" />
      <path d="M4 17l.5 1.5L6 19l-1.5.5L4 21l-.5-1.5L2 19l1.5-.5z" />
    </TransportIcon>
  ),
  dragon: (
    <TransportIcon>
      <path d="M3 17c3 0 5-1 7-3l3-3" />
      <path d="M13 11c1-3 3-5 6-5l2 1-2 1c0 2-1 3-3 4" />
      <path d="M8 13 5 6l5 3 2-5 2 6" />
      <path d="M10 14c1 2 3 3 6 3l3-1" />
      <path d="M12 16l-1 3M16 17l1 2" />
    </TransportIcon>
  ),
  blimp: (
    <TransportIcon>
      <ellipse cx="11" cy="10" rx="9" ry="4.5" />
      <path d="M19 7l3-2v10l-3-2" />
      <path d="M8 14.5 9 17h4l1-2.5" />
      <path d="M2 10h18" />
    </TransportIcon>
  ),
  scuba: (
    <TransportIcon>
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a3 3 0 0 1-3 3h-2.5L13 13h-2l-2.5 2H6a3 3 0 0 1-3-3z" />
      <path d="M21 9h1v9a3 3 0 0 1-3 3h-2" />
      <circle cx="7" cy="19.5" r="1" />
      <circle cx="10" cy="21" r="0.6" />
    </TransportIcon>
  ),
  surfboard: (
    <TransportIcon>
      <path d="M2 14c4-6 10-10 20-12-2 10-6 16-12 20-2-2-5-5-8-8z" />
      <path d="M6 18 18 6" />
    </TransportIcon>
  ),
  windsurfer: (
    <TransportIcon>
      <path d="M10 2v15" />
      <path d="M10 3c5 3 8 8 8 13h-8" />
      <path d="M10 10h6" />
      <path d="M3 18h18l-2 2H5z" />
    </TransportIcon>
  ),
};

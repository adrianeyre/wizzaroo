import { configDefaults, defineConfig } from "vitest/config";
import { readReleaseVersion } from "./src/release-version.js";

// The Island sweeps draw every Island model by model, minutes an Island: the sweeps project runs them, in the Island
// sweeps workflow and by `pnpm test:sweeps`, and `pnpm test` leaves them out.
const sweepTests = ["src/**/*.sweep.test.{ts,tsx}"];

const domTests = [
  "src/client/parent/**/*.test.tsx",
  "src/client/staff/**/*.test.tsx",
  "src/client/family-device/**/*.test.tsx",
  "src/client/site-footer/**/*.test.tsx",
  "src/client/site-header/**/*.test.tsx",
  "src/client/focus-recovery.test.ts",
  "src/client/read-aloud-button.test.tsx",
  "src/client/full-screen.test.ts",
  "src/client/bay-games.test.tsx",
  "src/client/woods-games.test.tsx",
  "src/client/science-lab.test.tsx",
  "src/client/music-stage.test.tsx",
  "src/client/computing-lab.test.tsx",
  "src/client/puzzles/**/*.test.tsx",
  "src/client/checks/check-play.test.tsx",
  "src/client/crystal-cave-games.test.tsx",
  "src/client/history-world.test.tsx",
  "src/client/world-map-islands.test.tsx",
  "src/client/islands/island-scene.test.tsx",
  "src/client/islands/island-explore.test.tsx",
  "src/client/islands/island-stage-props.test.tsx",
  "src/client/geography/**/*.test.tsx",
  "src/client/character/room-play*.test.tsx",
  "src/client/awards/awards-list-style.test.ts",
  "src/client/busy/**/*.test.tsx",
];

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(readReleaseVersion()),
  },
  test: {
    silent: false,
    // The Island scenes build whole 3D worlds, which takes several seconds a test on a two-core CI runner, past the 5 s default.
    testTimeout: 30_000,
    env: {
      DATABASE_URL: "postgres://wizzaroo_app@localhost:54320/wizzaroo",
      PUBLIC_URL: "http://localhost:4310",
      EMAIL_BASE_URL: "http://localhost:4320",
      EMAIL_API_KEY: "ek_the-tests-email-platform-key",
      TOTP_SECRET_KEY: "7e57".repeat(16),
      TUNNEL_PROXY_ADDRESS: "172.30.0.2",
    },
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.test-support.{ts,tsx}"],
      thresholds: process.env.CI
        ? { statements: 88, branches: 70, functions: 80, lines: 88 }
        : undefined,
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [...configDefaults.exclude, ...domTests, ...sweepTests],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: domTests,
          exclude: [...configDefaults.exclude, ...sweepTests],
          environment: "happy-dom",
        },
      },
      {
        extends: true,
        test: {
          name: "sweeps",
          include: sweepTests,
          environment: "happy-dom",
          testTimeout: 1_800_000,
        },
      },
    ],
  },
});

import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const speakingIsMadeBeforeRelease =
  "Voice-over is made before release; play a line with playVoiceOver, or read a question out loud with readAloud from src/client/voice-over/read-aloud.ts (ADR 0060)";

export default defineConfig(
  { ignores: ["dist", "coverage", ".sandcastle"] },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  reactHooks.configs.flat["recommended-latest"],
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.mjs", "*.ts"],
          defaultProject: "tsconfig.json",
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "no-restricted-globals": [
        "error",
        { name: "speechSynthesis", message: speakingIsMadeBeforeRelease },
        {
          name: "SpeechSynthesisUtterance",
          message: speakingIsMadeBeforeRelease,
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "speechSynthesis",
          message: speakingIsMadeBeforeRelease,
        },
        {
          object: "globalThis",
          property: "speechSynthesis",
          message: speakingIsMadeBeforeRelease,
        },
      ],
    },
  },
  {
    // The one place the device's speech voice is used: the Read it to me
    // button a Child presses (ADR 0060). Everything else stays recorded.
    files: ["src/client/voice-over/read-aloud.ts"],
    rules: {
      "no-restricted-globals": "off",
      "no-restricted-properties": "off",
    },
  },
);

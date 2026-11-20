import { runWizzaroo } from "./run-wizzaroo.js";

// Development's entry point, which pnpm run:local, pnpm migrate and pnpm seed:owner run. It differs from index.ts only in
// accepting .env.example's own secrets, which anyone can read, so a .env copied from the example starts (#308).
await runWizzaroo(process.argv.at(2), { isDevelopment: true });

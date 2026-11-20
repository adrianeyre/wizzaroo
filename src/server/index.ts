import { runWizzaroo } from "./run-wizzaroo.js";

// Production's entry point, and the one every container runs: it refuses .env.example's own secrets (#308).
await runWizzaroo(process.argv.at(2), { isDevelopment: false });

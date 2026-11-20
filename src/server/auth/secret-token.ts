import { createHash, randomBytes } from "node:crypto";

const secretTokenBytes = 32;

export const buildSecretToken = (): string =>
  randomBytes(secretTokenBytes).toString("base64url");

export const hashSecretToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const secondSchoolGateItems = [
  "legal advice on Wizzaroo's data protection role",
  "ICO registration",
  "a privacy policy and a data processing agreement with each School",
  "Postgres row-level security",
  "data export and deletion for Parents",
  "logged Admin access",
  "nightly encrypted backups kept off the home server",
  "a penetration test with every finding above low remediated or waived in writing",
  "a second penetration test round run by someone outside the project",
  "a request-rate policy set in pen-testing.md",
] as const;

export class SecondSchoolGateNotMetError extends Error {
  override readonly name = "SecondSchoolGateNotMetError";
  readonly statusCode = 409;

  constructor() {
    super(
      `Wizzaroo can't add a second School until all of these are in place: ${secondSchoolGateItems.join("; ")}. Once they are, set SECOND_SCHOOL_GATE_MET=true on the server`,
    );
  }
}

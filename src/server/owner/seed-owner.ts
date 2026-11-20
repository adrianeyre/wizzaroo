import { createInterface } from "node:readline";
import { Writable, type Readable } from "node:stream";
import type { Database } from "../database.js";
import { createOwner } from "./create-owner.js";
import {
  buildOwnerSeed,
  OwnerSeedRefusedError,
  type OwnerAnswers,
} from "./owner-seed.js";

type Terminal = Readable & { isTTY?: boolean };

interface OwnerTerminal {
  input: Terminal;
  output: Writable;
}

const askOwnerAnswers = async ({
  input,
  output,
}: OwnerTerminal): Promise<OwnerAnswers> => {
  let isEchoing = true;
  const echo = new Writable({
    write: (chunk: Buffer | string, encoding, callback) => {
      if (isEchoing) {
        output.write(chunk, encoding);
      }
      callback();
    },
  });

  const isTerminal = input.isTTY === true;
  const prompt = createInterface({
    input,
    output: echo,
    prompt: "",
    terminal: isTerminal,
  });
  prompt.on("SIGINT", () => {
    prompt.close();
  });
  const answerLines = prompt[Symbol.asyncIterator]();

  const readAnswerLine = async (): Promise<string> => {
    const answerLine = await answerLines.next();
    if (answerLine.done === true) {
      throw new OwnerSeedRefusedError(
        "seed:owner was stopped before it had every answer, so nothing was created",
      );
    }
    return answerLine.value;
  };

  const askVisibly = async (question: string): Promise<string> => {
    if (isTerminal) {
      prompt.setPrompt(question);
      prompt.prompt();
    } else {
      output.write(question);
    }
    return readAnswerLine();
  };

  const askHiddenly = async (question: string): Promise<string> => {
    output.write(question);
    prompt.setPrompt("");
    isEchoing = false;
    try {
      return await readAnswerLine();
    } finally {
      isEchoing = true;
      output.write("\n");
    }
  };

  try {
    const email = await askVisibly("The owner's email address: ");
    const password = await askHiddenly("A password (it won't show): ");
    const repeatedPassword = await askHiddenly("The same password again: ");
    const familyName = await askVisibly("The Family's name: ");
    return { email, password, repeatedPassword, familyName };
  } finally {
    prompt.close();
  }
};

interface SeedOwnerParts extends OwnerTerminal {
  database: Database;
}

export const seedOwner = async ({
  database,
  input,
  output,
}: SeedOwnerParts): Promise<void> => {
  const ownerSeed = buildOwnerSeed(await askOwnerAnswers({ input, output }));
  await createOwner(database, ownerSeed);
  output.write(
    `Created the owner, ${ownerSeed.email}, as an Admin and a Parent in the Family "${ownerSeed.familyName}". Name their School on the Admin dashboard the first time you sign in.\n`,
  );
};

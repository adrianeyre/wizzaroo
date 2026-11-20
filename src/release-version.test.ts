import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  developmentVersion,
  findReleaseVersion,
  listTagNames,
  readReleaseVersion,
} from "./release-version.js";

const sha = "067cbae0000000000000000000000000000000aa";

describe("findReleaseVersion", () => {
  it("picks the highest vX.Y.Z tag by number, not by spelling", () => {
    expect(findReleaseVersion(["v1.9.0", "v1.10.0", "v1.2.3"])).toBe("1.10.0");
    expect(findReleaseVersion(["v2.0.0", "v1.99.99"])).toBe("2.0.0");
  });

  it("ignores tags semantic-release didn't make", () => {
    expect(
      findReleaseVersion(["v1.1.0", "v9.0.0-beta.1", "release-7", "9.0.0"]),
    ).toBe("1.1.0");
  });

  it("says development while there is no release tag", () => {
    expect(findReleaseVersion([])).toBe(developmentVersion);
    expect(findReleaseVersion(["not-a-release"])).toBe(developmentVersion);
  });
});

describe("reading the tags git keeps", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "release-version-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("reads loose and packed tags alike", async () => {
    const dotGit = join(directory, ".git");
    await mkdir(join(dotGit, "refs", "tags", "nested"), { recursive: true });
    await writeFile(join(dotGit, "refs", "tags", "v1.1.0"), `${sha}\n`);
    await writeFile(join(dotGit, "refs", "tags", "nested", "x"), `${sha}\n`);
    await writeFile(
      join(dotGit, "packed-refs"),
      [
        "# pack-refs with: peeled fully-peeled sorted",
        `${sha} refs/heads/main`,
        `${sha} refs/tags/v1.0.0`,
        `^${sha}`,
        "",
      ].join("\n"),
    );

    expect(listTagNames(dotGit).toSorted()).toEqual([
      "nested/x",
      "v1.0.0",
      "v1.1.0",
    ]);
    expect(readReleaseVersion(dotGit)).toBe("1.1.0");
  });

  it("follows a worktree's .git file to the repo that holds the tags", async () => {
    const commonGit = join(directory, "main", ".git");
    const worktreeGit = join(commonGit, "worktrees", "sandbox");
    await mkdir(join(commonGit, "refs", "tags"), { recursive: true });
    await mkdir(worktreeGit, { recursive: true });
    await writeFile(join(commonGit, "refs", "tags", "v3.2.1"), `${sha}\n`);
    await writeFile(join(worktreeGit, "commondir"), "../..\n");
    await mkdir(join(directory, "sandbox"));
    await writeFile(
      join(directory, "sandbox", ".git"),
      `gitdir: ${worktreeGit}\n`,
    );

    expect(readReleaseVersion(join(directory, "sandbox", ".git"))).toBe(
      "3.2.1",
    );
  });

  it("says development when there is no .git, as in a tarball", () => {
    expect(readReleaseVersion(join(directory, ".git"))).toBe(
      developmentVersion,
    );
  });

  it("says development when .git holds no tags, as in a fresh clone of an untagged repo", async () => {
    await mkdir(join(directory, ".git"));

    expect(readReleaseVersion(join(directory, ".git"))).toBe(
      developmentVersion,
    );
  });
});

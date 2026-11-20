import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

/** What the footer shows when no release tag can be read: a tarball, a shallow clone or a sandbox. */
export const developmentVersion = "development";

const releaseTagPattern = /^v(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)$/;
const packedTagPattern = /^[0-9a-f]{40,64} refs\/tags\/(?<name>\S+)$/;

const isMissing = (error: unknown): boolean =>
  error instanceof Error &&
  "code" in error &&
  (error.code === "ENOENT" || error.code === "ENOTDIR");

const readIfPresent = (path: string): string | undefined => {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    if (isMissing(error)) {
      return undefined;
    }
    throw error;
  }
};

/** A worktree's `.git` is a file naming its own directory, whose `commondir` names the one that holds the tags. */
const findCommonGitDirectory = (dotGit: string): string => {
  if (statSync(dotGit).isDirectory()) {
    return dotGit;
  }
  const gitDirectory = resolve(
    dotGit,
    "..",
    readFileSync(dotGit, "utf8")
      .replace(/^gitdir:\s*/, "")
      .trim(),
  );
  const commonDirectory = readIfPresent(join(gitDirectory, "commondir"));
  return commonDirectory === undefined
    ? gitDirectory
    : resolve(gitDirectory, commonDirectory.trim());
};

const listLooseTagNames = (tagsDirectory: string): string[] => {
  try {
    return readdirSync(tagsDirectory, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) =>
        relative(tagsDirectory, join(entry.parentPath, entry.name))
          .split(sep)
          .join("/"),
      );
  } catch (error) {
    if (isMissing(error)) {
      return [];
    }
    throw error;
  }
};

const listPackedTagNames = (gitDirectory: string): string[] =>
  (readIfPresent(join(gitDirectory, "packed-refs")) ?? "")
    .split("\n")
    .flatMap((line) => {
      const name = packedTagPattern.exec(line)?.groups?.name;
      return name === undefined ? [] : [name];
    });

/** Every tag's name, read from the files git keeps them in, so the build needs no `git` binary. */
export const listTagNames = (dotGit: string): string[] => {
  const gitDirectory = findCommonGitDirectory(dotGit);
  return [
    ...listLooseTagNames(join(gitDirectory, "refs", "tags")),
    ...listPackedTagNames(gitDirectory),
  ];
};

/** The highest `vX.Y.Z` tag's version, which semantic-release made; other tags are ignored. */
export const findReleaseVersion = (tagNames: readonly string[]): string => {
  const versions = tagNames.flatMap((tagName) => {
    const groups = releaseTagPattern.exec(tagName)?.groups;
    return groups === undefined
      ? []
      : [[Number(groups.major), Number(groups.minor), Number(groups.patch)]];
  });
  const highest = versions
    .toSorted(
      (left, right) =>
        right[0] - left[0] || right[1] - left[1] || right[2] - left[2],
    )
    .at(0);
  return highest === undefined ? developmentVersion : highest.join(".");
};

/** The version the footer shows: the highest release tag in the repo at `dotGit`, or `development` without one. */
export const readReleaseVersion = (dotGit = resolve(".git")): string => {
  try {
    return findReleaseVersion(listTagNames(dotGit));
  } catch (error) {
    if (isMissing(error)) {
      return developmentVersion;
    }
    throw error;
  }
};

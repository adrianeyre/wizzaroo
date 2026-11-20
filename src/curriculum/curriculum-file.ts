export class InvalidCurriculumFileError extends Error {
  override name = "InvalidCurriculumFileError";
}

export const kebabCaseShape = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const readFields = (
  value: unknown,
  allowedFields: readonly string[],
  describedAs: string,
): Map<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidCurriculumFileError(`${describedAs} must be an object`);
  }
  const fields = new Map<string, unknown>(Object.entries(value));
  const unexpectedField = [...fields.keys()].find(
    (field) => !allowedFields.includes(field),
  );
  if (unexpectedField !== undefined) {
    throw new InvalidCurriculumFileError(
      `${describedAs} has a field "${unexpectedField}" it doesn't know`,
    );
  }
  return fields;
};

export const isNonEmptyList = (value: unknown): value is unknown[] =>
  Array.isArray(value) && value.length > 0;

export const findRepeat = <Value>(
  values: readonly Value[],
): Value | undefined =>
  values.find((value, position) => values.indexOf(value) !== position);

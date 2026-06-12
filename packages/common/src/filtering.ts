import { isNonEmptyString, isRecord } from './guards';

export type FilterPrimitive = string | number | boolean;
export type FilterParser<T> = (value: unknown) => T | undefined;

export function normalizeOptionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

export function normalizeOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return undefined;
}

export function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeStringArray(
  value: unknown,
): readonly string[] | undefined {
  const values = Array.isArray(value) ? value : [value];
  const normalized = values.filter(isNonEmptyString).map((item) => item.trim());

  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeFilters<
  Schema extends Record<string, FilterParser<unknown>>,
>(
  input: unknown,
  schema: Schema,
): Partial<{ [Key in keyof Schema]: ReturnType<Schema[Key]> }> {
  if (!isRecord(input)) {
    return {};
  }

  const result: Partial<{ [Key in keyof Schema]: ReturnType<Schema[Key]> }> =
    {};

  for (const key of Object.keys(schema) as (keyof Schema)[]) {
    const normalized = schema[key](input[String(key)]);

    if (normalized !== undefined) {
      result[key] = normalized as ReturnType<Schema[typeof key]>;
    }
  }

  return result;
}

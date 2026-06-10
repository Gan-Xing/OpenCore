export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export function createValidationIssue(
  path: string,
  message: string,
): ValidationIssue {
  return {
    path,
    message,
  };
}

export function createValidationResult(
  issues: ValidationIssue[] = [],
): ValidationResult {
  return {
    valid: issues.length === 0,
    issues,
  };
}

export function combineValidationResults(
  results: readonly ValidationResult[],
): ValidationResult {
  return createValidationResult(results.flatMap((result) => result.issues));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function findDuplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
      continue;
    }

    seen.add(value);
  }

  return [...duplicates].sort();
}

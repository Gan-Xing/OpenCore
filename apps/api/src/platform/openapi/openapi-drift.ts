export type OpenApiDocumentLike = {
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
  };
};

export type OpenApiDriftResult = {
  status: 'clean' | 'drift';
  checkedAt: string;
  diffSummary: string[];
};

export function compareOpenApiDocuments(
  expected: OpenApiDocumentLike,
  actual: OpenApiDocumentLike,
  checkedAt = new Date().toISOString(),
): OpenApiDriftResult {
  const diffSummary = [
    ...diffKeys('paths', expected.paths ?? {}, actual.paths ?? {}),
    ...diffKeys(
      'components.schemas',
      expected.components?.schemas ?? {},
      actual.components?.schemas ?? {},
    ),
  ];

  if (stableStringify(expected) !== stableStringify(actual)) {
    diffSummary.push('OpenAPI document content differs from snapshot.');
  }

  return {
    status: diffSummary.length === 0 ? 'clean' : 'drift',
    checkedAt,
    diffSummary: [...new Set(diffSummary)],
  };
}

function diffKeys(
  label: string,
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): string[] {
  const expectedKeys = new Set(Object.keys(expected));
  const actualKeys = new Set(Object.keys(actual));
  const messages: string[] = [];

  for (const key of actualKeys) {
    if (!expectedKeys.has(key)) {
      messages.push(`Added ${label}: ${key}`);
    }
  }

  for (const key of expectedKeys) {
    if (!actualKeys.has(key)) {
      messages.push(`Removed ${label}: ${key}`);
    }
  }

  return messages.sort();
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, sortJson(entryValue)]),
    );
  }

  return value;
}

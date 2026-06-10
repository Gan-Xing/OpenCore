import { isAbsolute, normalize } from 'node:path';

export type OpenForgePathSafetyResult = {
  blocked: boolean;
  protected: boolean;
  reason?: string;
};

function normalizeRepoPath(targetPath: string): string {
  return normalize(targetPath).replace(/\\/g, '/');
}

function hasTraversalSegment(targetPath: string): boolean {
  return targetPath.split(/[\\/]+/).includes('..');
}

export function isProtectedPath(targetPath: string): boolean {
  const normalizedPath = normalizeRepoPath(targetPath);

  return (
    normalizedPath === '.env' ||
    /^\.env\..+/.test(normalizedPath) ||
    normalizedPath === 'prisma/schema.prisma' ||
    normalizedPath.startsWith('prisma/migrations/')
  );
}

export function evaluatePathSafety(
  targetPath: string,
): OpenForgePathSafetyResult {
  const normalizedPath = normalizeRepoPath(targetPath);

  if (isAbsolute(targetPath)) {
    return {
      blocked: true,
      protected: false,
      reason: 'Absolute paths are forbidden.',
    };
  }

  if (hasTraversalSegment(targetPath) || normalizedPath.startsWith('../')) {
    return {
      blocked: true,
      protected: false,
      reason: 'Path traversal is forbidden.',
    };
  }

  if (isProtectedPath(targetPath)) {
    return {
      blocked: true,
      protected: true,
      reason: 'Protected path cannot be generated or overwritten.',
    };
  }

  return {
    blocked: false,
    protected: false,
  };
}

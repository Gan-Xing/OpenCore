import type { OpenForgeVirtualFile } from '@opencore/contracts';

export function sortOpenForgeVirtualFiles(
  files: readonly OpenForgeVirtualFile[],
): readonly OpenForgeVirtualFile[] {
  return [...files].sort((left, right) =>
    left.targetPath.localeCompare(right.targetPath),
  );
}

export function findOpenForgeVirtualFile(
  files: readonly OpenForgeVirtualFile[],
  targetPath: string,
): OpenForgeVirtualFile | undefined {
  return files.find((file) => file.targetPath === targetPath);
}

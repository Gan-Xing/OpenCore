import type { PrismaClient } from '@prisma/client';

export type DatabaseSeedStepResult = {
  name: string;
  count?: number;
};

export type DatabaseSeedStep = {
  name: string;
  run: (prisma: PrismaClient) => Promise<number | void>;
};

export async function runDatabaseSeedSteps(
  prisma: PrismaClient,
  steps: readonly DatabaseSeedStep[],
): Promise<readonly DatabaseSeedStepResult[]> {
  const results: DatabaseSeedStepResult[] = [];

  for (const step of steps) {
    const stepResult = await step.run(prisma);
    results.push({
      name: step.name,
      count: typeof stepResult === 'number' ? stepResult : undefined,
    });
  }

  return results;
}

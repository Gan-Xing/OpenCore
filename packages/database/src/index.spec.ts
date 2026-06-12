import {
  DEFAULT_DATABASE_URL,
  readDatabaseOptionsFromEnv,
} from './database-options';
import { createPrismaClient } from './prisma-client';
import { PrismaService } from './prisma.service';
import { runDatabaseSeedSteps } from './seed';

describe('@opencore/database', () => {
  it('reads DATABASE_URL with a stable local fallback', () => {
    expect(readDatabaseOptionsFromEnv({ DATABASE_URL: undefined })).toEqual({
      databaseUrl: DEFAULT_DATABASE_URL,
    });
    expect(
      readDatabaseOptionsFromEnv({
        DATABASE_URL: ' postgresql://user:pass@localhost:5432/app ',
      }),
    ).toEqual({
      databaseUrl: 'postgresql://user:pass@localhost:5432/app',
    });
  });

  it('creates Prisma client and service without opening a connection eagerly', async () => {
    const options = {
      databaseUrl: DEFAULT_DATABASE_URL,
    };
    const client = createPrismaClient(options);
    const service = new PrismaService(options);

    expect(client).toBeDefined();
    expect(typeof service.$disconnect).toBe('function');

    await client.$disconnect();
    await service.$disconnect();
  });

  it('runs seed steps sequentially and returns counts', async () => {
    const calls: string[] = [];
    const prisma = {} as Parameters<
      Parameters<typeof runDatabaseSeedSteps>[1][number]['run']
    >[0];

    await expect(
      runDatabaseSeedSteps(prisma, [
        {
          name: 'permissions',
          run: async () => {
            calls.push('permissions');
            return 2;
          },
        },
        {
          name: 'menus',
          run: async () => {
            calls.push('menus');
          },
        },
      ]),
    ).resolves.toEqual([
      { name: 'permissions', count: 2 },
      { name: 'menus', count: undefined },
    ]);
    expect(calls).toEqual(['permissions', 'menus']);
  });
});

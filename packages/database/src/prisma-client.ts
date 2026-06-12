import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  readDatabaseOptionsFromEnv,
  type DatabaseOptions,
} from './database-options';

export function createPrismaPgAdapter(databaseUrl: string): PrismaPg {
  return new PrismaPg({ connectionString: databaseUrl });
}

export function createPrismaClient(
  options: DatabaseOptions = readDatabaseOptionsFromEnv(),
): PrismaClient {
  return new PrismaClient({
    adapter: createPrismaPgAdapter(options.databaseUrl),
  });
}

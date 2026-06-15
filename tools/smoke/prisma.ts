import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { assertString } from './runtime';

let prisma: PrismaClient | undefined;

export function getSmokePrisma() {
  if (!prisma) {
    const connectionString = assertString(
      process.env.DATABASE_URL,
      'DATABASE_URL',
    );
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  return prisma;
}

export async function disconnectSmokePrisma() {
  await prisma?.$disconnect();
  prisma = undefined;
}

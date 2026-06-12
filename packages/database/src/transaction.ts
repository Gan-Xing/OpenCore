import type { Prisma, PrismaClient } from '@prisma/client';

export type PrismaTransactionClient = Prisma.TransactionClient;

export function runInPrismaTransaction<T>(
  prisma: PrismaClient,
  callback: (transaction: PrismaTransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(callback);
}

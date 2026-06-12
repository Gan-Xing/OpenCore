import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  readDatabaseOptionsFromEnv,
  type DatabaseOptions,
} from './database-options';
import { createPrismaPgAdapter } from './prisma-client';

export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(options: DatabaseOptions = readDatabaseOptionsFromEnv()) {
    super({
      adapter: createPrismaPgAdapter(options.databaseUrl),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

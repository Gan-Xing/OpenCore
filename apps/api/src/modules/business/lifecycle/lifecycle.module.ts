import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { BusinessLifecycleController } from './lifecycle.controller';
import { BusinessLifecycleRepository } from './lifecycle.repository';
import { PrismaLifecycleRepository } from './prisma-lifecycle.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [BusinessLifecycleController],
  providers: [
    {
      provide: BusinessLifecycleRepository,
      useClass: PrismaLifecycleRepository,
    },
  ],
  exports: [BusinessLifecycleRepository],
})
export class BusinessLifecycleModule {}

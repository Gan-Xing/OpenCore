import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { SchedulerJobExecutor } from './scheduler.executor';
import { PrismaSchedulerRepository } from './scheduler.prisma-repository';
import { SchedulerRepository } from './scheduler.repository';
import { SchedulerRuntimeService } from './scheduler.runtime';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SchedulerRepository,
      useClass: PrismaSchedulerRepository,
    },
    SchedulerJobExecutor,
    SchedulerRuntimeService,
    SchedulerService,
  ],
  exports: [
    SchedulerJobExecutor,
    SchedulerRepository,
    SchedulerRuntimeService,
    SchedulerService,
  ],
})
export class SchedulerModule {}

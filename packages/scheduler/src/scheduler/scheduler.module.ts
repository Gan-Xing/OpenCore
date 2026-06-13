import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { SchedulerJobExecutor } from './scheduler.executor';
import { PrismaSchedulerRepository } from './scheduler.prisma-repository';
import { SchedulerRepository } from './scheduler.repository';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: SchedulerRepository,
      useClass: PrismaSchedulerRepository,
    },
    SchedulerJobExecutor,
    SchedulerService,
  ],
  exports: [SchedulerJobExecutor, SchedulerRepository, SchedulerService],
})
export class SchedulerModule {}

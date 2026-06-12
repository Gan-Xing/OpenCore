import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
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
    SchedulerService,
  ],
  exports: [SchedulerRepository, SchedulerService],
})
export class SchedulerModule {}

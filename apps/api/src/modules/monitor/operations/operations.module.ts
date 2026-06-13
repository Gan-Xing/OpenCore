import { Module } from '@nestjs/common';
import { AuditLoginLogModule } from '@opencore/audit';
import { DatabaseModule } from '@opencore/database';
import { OnlineUserModule } from '@opencore/online-user';
import { SchedulerModule } from '@opencore/scheduler';
import { OperationsController } from './operations.controller';
import { OperationsRepository } from './operations.repository';
import { PrismaOperationsRepository } from './prisma-operations.repository';

@Module({
  imports: [
    AuditLoginLogModule,
    DatabaseModule,
    OnlineUserModule,
    SchedulerModule,
  ],
  controllers: [OperationsController],
  providers: [
    {
      provide: OperationsRepository,
      useClass: PrismaOperationsRepository,
    },
  ],
  exports: [OperationsRepository],
})
export class OperationsModule {}

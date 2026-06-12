import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { PrismaAuditOperationLogRepository } from './audit-operation-log.prisma-repository';
import { AuditOperationLogRepository } from './audit-operation-log.repository';
import { AuditOperationLogService } from './audit-operation-log.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: AuditOperationLogRepository,
      useClass: PrismaAuditOperationLogRepository,
    },
    AuditOperationLogService,
  ],
  exports: [AuditOperationLogRepository, AuditOperationLogService],
})
export class AuditOperationLogModule {}

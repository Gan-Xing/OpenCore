import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { SecurityLoginAttemptRecorder } from '@opencore/security';
import { PrismaAuditLoginLogRepository } from './audit-login-log.prisma-repository';
import { AuditLoginLogRepository } from './audit-login-log.repository';
import { AuditLoginLogService } from './audit-login-log.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: AuditLoginLogRepository,
      useClass: PrismaAuditLoginLogRepository,
    },
    {
      provide: SecurityLoginAttemptRecorder,
      useExisting: AuditLoginLogRepository,
    },
    AuditLoginLogService,
  ],
  exports: [
    AuditLoginLogRepository,
    SecurityLoginAttemptRecorder,
    AuditLoginLogService,
  ],
})
export class AuditLoginLogModule {}

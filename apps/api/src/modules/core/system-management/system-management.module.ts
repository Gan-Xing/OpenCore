import { Module } from '@nestjs/common';
import { AuditLoginLogModule, AuditOperationLogModule } from '@opencore/audit';
import { DatabaseModule } from '@opencore/database';
import {
  SystemConfigModule,
  SystemDeptModule,
  SystemDictModule,
  SystemNoticeModule,
  SystemPostModule,
} from '@opencore/system';
import { PrismaSystemManagementRepository } from './prisma-system-management.repository';
import { SystemManagementController } from './system-management.controller';
import { SystemManagementRepository } from './system-management.repository';

@Module({
  imports: [
    DatabaseModule,
    AuditLoginLogModule,
    AuditOperationLogModule,
    SystemDictModule,
    SystemConfigModule,
    SystemNoticeModule,
    SystemDeptModule,
    SystemPostModule,
  ],
  controllers: [SystemManagementController],
  providers: [
    {
      provide: SystemManagementRepository,
      useClass: PrismaSystemManagementRepository,
    },
  ],
  exports: [SystemManagementRepository],
})
export class SystemManagementModule {}

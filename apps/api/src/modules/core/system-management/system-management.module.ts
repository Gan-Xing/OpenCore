import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../platform/database/database.module';
import { PrismaSystemManagementRepository } from './prisma-system-management.repository';
import { SystemManagementController } from './system-management.controller';
import { SystemManagementRepository } from './system-management.repository';

@Module({
  imports: [DatabaseModule],
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

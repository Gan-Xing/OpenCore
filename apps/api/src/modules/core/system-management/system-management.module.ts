import { Module } from '@nestjs/common';
import { SystemManagementController } from './system-management.controller';
import { SystemManagementRepository } from './system-management.repository';

@Module({
  controllers: [SystemManagementController],
  providers: [SystemManagementRepository],
  exports: [SystemManagementRepository],
})
export class SystemManagementModule {}

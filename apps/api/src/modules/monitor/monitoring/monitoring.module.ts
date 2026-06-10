import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringRepository } from './monitoring.repository';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringRepository],
})
export class MonitoringModule {}

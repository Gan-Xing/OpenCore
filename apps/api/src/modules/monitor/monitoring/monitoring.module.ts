import { Module } from '@nestjs/common';
import { MonitorModule } from '@opencore/monitor';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [MonitorModule],
  controllers: [MonitoringController],
  exports: [MonitorModule],
})
export class MonitoringModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { MonitoringController } from './monitoring.controller';
import { MonitoringRepository } from './monitoring.repository';
import {
  RUNTIME_DIAGNOSTICS,
  RuntimeDiagnosticsService,
} from './runtime-diagnostics.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MonitoringController],
  providers: [
    MonitoringRepository,
    RuntimeDiagnosticsService,
    {
      provide: RUNTIME_DIAGNOSTICS,
      useExisting: RuntimeDiagnosticsService,
    },
  ],
})
export class MonitoringModule {}

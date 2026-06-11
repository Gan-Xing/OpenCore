import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { MonitorHealthService } from './monitor.health.service';
import { MonitorRepository } from './monitor.repository';
import {
  MONITOR_RUNTIME_DIAGNOSTICS,
  MonitorRuntimeDiagnosticsService,
} from './monitor.runtime-diagnostics.service';
import { MonitorService } from './monitor.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    MonitorHealthService,
    MonitorRepository,
    MonitorRuntimeDiagnosticsService,
    MonitorService,
    {
      provide: MONITOR_RUNTIME_DIAGNOSTICS,
      useExisting: MonitorRuntimeDiagnosticsService,
    },
  ],
  exports: [
    MonitorHealthService,
    MonitorRepository,
    MonitorRuntimeDiagnosticsService,
    MonitorService,
    MONITOR_RUNTIME_DIAGNOSTICS,
  ],
})
export class MonitorModule {}

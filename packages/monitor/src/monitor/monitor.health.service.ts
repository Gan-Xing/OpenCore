import { Injectable } from '@nestjs/common';
import type { HealthCheckDto, HealthResponseDto } from './monitor.dto';

@Injectable()
export class MonitorHealthService {
  live(): HealthResponseDto {
    return this.createHealthResponse('ok', [
      {
        name: 'process',
        status: 'ok',
        critical: true,
      },
    ]);
  }

  ready(): HealthResponseDto {
    return this.createHealthResponse('ready', [
      {
        name: 'process',
        status: 'ok',
        critical: true,
      },
      {
        name: 'config',
        status: 'ok',
        critical: true,
      },
    ]);
  }

  private createHealthResponse(
    status: HealthResponseDto['status'],
    checks: HealthCheckDto[],
  ): HealthResponseDto {
    return {
      status,
      service: 'opencore-api',
      version: '0.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks,
    };
  }
}

import { MonitorHealthService } from '@opencore/monitor';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const controller = new HealthController(new MonitorHealthService());

  it('returns liveness status', () => {
    expect(controller.live()).toEqual({
      status: 'ok',
      service: 'opencore-api',
      version: '0.0.0',
      timestamp: expect.any(String),
      uptimeSeconds: expect.any(Number),
      checks: [
        {
          name: 'process',
          status: 'ok',
          critical: true,
        },
      ],
    });
  });

  it('returns readiness status with S4 foundation checks', () => {
    expect(controller.ready()).toEqual({
      status: 'ready',
      service: 'opencore-api',
      version: '0.0.0',
      timestamp: expect.any(String),
      uptimeSeconds: expect.any(Number),
      checks: [
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
      ],
    });
  });
});

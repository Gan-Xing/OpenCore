import { HealthController } from './health.controller';

describe('HealthController', () => {
  const controller = new HealthController();

  it('returns liveness status', () => {
    expect(controller.live()).toEqual({
      status: 'ok',
      service: 'opencore-api',
    });
  });

  it('returns readiness status without external checks in S2', () => {
    expect(controller.ready()).toEqual({
      status: 'ready',
      service: 'opencore-api',
      checks: [],
    });
  });
});

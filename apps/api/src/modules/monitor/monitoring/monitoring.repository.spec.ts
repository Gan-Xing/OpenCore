import { MonitoringRepository } from './monitoring.repository';

describe('MonitoringRepository', () => {
  it('returns status checks without leaking sensitive configuration', () => {
    process.env.DATABASE_URL = 'postgresql://secret@example/opencore';
    process.env.AUTH_TOKEN_SECRET = 'secret-token-value';
    const repository = new MonitoringRepository();
    const payload = JSON.stringify(repository.getSystemStatus());

    expect(payload).toContain('database');
    expect(payload).not.toContain('secret');
    expect(payload).not.toContain('postgresql://');
  });

  it('returns read-only queue status without scheduler controls', () => {
    const repository = new MonitoringRepository();

    expect(repository.listQueues().queues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'table-export',
          driver: 'memory-readonly',
          readOnly: true,
        }),
      ]),
    );
  });

  it('returns safe version metadata', () => {
    const repository = new MonitoringRepository();

    expect(repository.getVersionInfo()).toMatchObject({
      name: 'opencore-api',
      version: expect.any(String),
      nodeVersion: expect.stringMatching(/^v/),
    });
  });
});

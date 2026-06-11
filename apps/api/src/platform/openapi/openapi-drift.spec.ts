import { compareOpenApiDocuments } from '@opencore/core';

describe('OpenAPI drift check', () => {
  it('passes identical documents', () => {
    const document = {
      paths: {
        '/health/live': {},
      },
      components: {
        schemas: {
          HealthDto: {},
        },
      },
    };

    expect(compareOpenApiDocuments(document, document)).toMatchObject({
      status: 'clean',
      diffSummary: [],
    });
  });

  it('fails when paths or schemas drift', () => {
    const result = compareOpenApiDocuments(
      {
        paths: {
          '/health/live': {},
        },
        components: {
          schemas: {
            HealthDto: {},
          },
        },
      },
      {
        paths: {
          '/health/live': {},
          '/monitor/status': {},
        },
        components: {
          schemas: {
            HealthDto: {},
            SystemStatusDto: {},
          },
        },
      },
      '2026-06-10T00:00:00.000Z',
    );

    expect(result).toEqual({
      status: 'drift',
      checkedAt: '2026-06-10T00:00:00.000Z',
      diffSummary: expect.arrayContaining([
        'Added paths: /monitor/status',
        'Added components.schemas: SystemStatusDto',
        'OpenAPI document content differs from snapshot.',
      ]),
    });
  });
});

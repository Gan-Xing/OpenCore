import {
  REQUEST_ID_HEADER,
  TRACE_ID_HEADER,
  createErrorResponse,
  createPageResult,
  createSuccessResponse,
  errorCodeFromHttpStatus,
  findDuplicateValues,
  isNonEmptyString,
  isRecord,
  normalizeFilters,
  normalizeOptionalBoolean,
  normalizeOptionalNumber,
  normalizeOptionalString,
  normalizePagination,
  normalizeSort,
  normalizeStringArray,
  getIpLocationProviderStatus,
  lookupIpLocation,
  parseIpLocation,
  parseUserAgent,
  sanitizeErrorCode,
} from './index';

describe('@opencore/common', () => {
  it('exports stable request context header names', () => {
    expect(REQUEST_ID_HEADER).toBe('x-request-id');
    expect(TRACE_ID_HEADER).toBe('x-trace-id');
  });

  it('normalizes pagination with bounded defaults and offsets', () => {
    expect(normalizePagination({ page: '3', pageSize: '500' })).toEqual({
      page: 3,
      pageSize: 100,
      offset: 200,
      limit: 100,
    });
    expect(normalizePagination({ page: '0', pageSize: '-1' })).toEqual({
      page: 1,
      pageSize: 10,
      offset: 0,
      limit: 10,
    });
  });

  it('creates deterministic page result metadata', () => {
    expect(createPageResult(['a', 'b'], { page: 2, pageSize: 2 }, 5)).toEqual({
      items: ['a', 'b'],
      page: 2,
      pageSize: 2,
      total: 5,
      totalPages: 3,
    });
  });

  it('normalizes sort only against admitted fields', () => {
    expect(
      normalizeSort(
        { sortBy: 'name', sortDirection: 'DESC' },
        ['createdAt', 'name'],
        { sortBy: 'createdAt', sortDirection: 'asc' },
      ),
    ).toEqual({ sortBy: 'name', sortDirection: 'desc' });
    expect(
      normalizeSort(
        { sortBy: 'unsafe', sortDirection: 'sideways' },
        ['createdAt', 'name'],
        { sortBy: 'createdAt', sortDirection: 'asc' },
      ),
    ).toEqual({ sortBy: 'createdAt', sortDirection: 'asc' });
  });

  it('normalizes only whitelisted filters', () => {
    expect(
      normalizeFilters(
        {
          enabled: 'false',
          count: '42',
          name: '  OpenCore  ',
          labels: [' alpha ', '', 'beta'],
          ignored: 'not admitted',
        },
        {
          enabled: normalizeOptionalBoolean,
          count: normalizeOptionalNumber,
          name: normalizeOptionalString,
          labels: normalizeStringArray,
        },
      ),
    ).toEqual({
      enabled: false,
      count: 42,
      name: 'OpenCore',
      labels: ['alpha', 'beta'],
    });
  });

  it('keeps framework-neutral response contracts', () => {
    expect(createSuccessResponse({ ok: true }, { requestId: 'req-1' })).toEqual(
      {
        success: true,
        data: { ok: true },
        requestId: 'req-1',
      },
    );
    expect(
      createErrorResponse({
        code: 'BAD_REQUEST',
        message: 'Invalid payload',
        statusCode: 400,
        timestamp: '2026-06-11T00:00:00.000Z',
      }),
    ).toEqual({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid payload',
        statusCode: 400,
        timestamp: '2026-06-11T00:00:00.000Z',
      },
    });
  });

  it('sanitizes and falls back error codes consistently', () => {
    expect(sanitizeErrorCode('Bad Request')).toBe('BAD_REQUEST');
    expect(errorCodeFromHttpStatus(400, 'Bad Request')).toBe('BAD_REQUEST');
    expect(errorCodeFromHttpStatus(404)).toBe('HTTP_404');
    expect(errorCodeFromHttpStatus(503)).toBe('INTERNAL_SERVER_ERROR');
  });

  it('provides small deterministic runtime guards', () => {
    expect(isRecord({ ok: true })).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isNonEmptyString(' value ')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(findDuplicateValues(['b', 'a', 'b', 'c', 'a'])).toEqual(['a', 'b']);
  });

  it('parses common user agents into product-facing browser and OS labels', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toEqual({ browser: 'Chrome', os: 'Windows' });
    expect(
      parseUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({ browser: 'Safari', os: 'iOS' });
    expect(parseUserAgent('opencore-smoke')).toEqual({
      browser: 'OpenCore Smoke',
      os: 'Unknown',
    });
  });

  it('parses IP addresses into deterministic location labels', () => {
    expect(parseIpLocation('127.0.0.1')).toBe('Loopback');
    expect(parseIpLocation('::ffff:127.0.0.1')).toBe('Loopback');
    expect(parseIpLocation('10.1.2.3')).toBe('Private network');
    expect(parseIpLocation('172.16.1.2')).toBe('Private network');
    expect(parseIpLocation('192.168.1.5')).toBe('Private network');
    expect(parseIpLocation('169.254.1.5')).toBe('Link-local');
    expect(parseIpLocation('100.64.0.1')).toBe('Shared address space');
    expect(parseIpLocation('203.0.113.8')).toBe('Documentation network');
    expect(parseIpLocation('8.8.8.8')).toBe('Public network');
    expect(parseIpLocation('bad-ip')).toBe('Unknown');
  });

  it('looks up IP addresses with provider and confidence metadata', () => {
    expect(lookupIpLocation('203.0.113.8')).toEqual({
      ip: '203.0.113.8',
      location: 'Documentation network',
      category: 'Documentation network',
      networkType: 'documentation',
      provider: 'opencore.builtin',
      source: 'builtin-cidr',
      confidence: 'range',
      enriched: true,
    });
    expect(lookupIpLocation('127.0.0.1')).toMatchObject({
      ip: '127.0.0.1',
      location: 'Loopback',
      networkType: 'loopback',
      confidence: 'exact',
      enriched: true,
    });
    expect(lookupIpLocation('8.8.8.8')).toMatchObject({
      location: 'Public network',
      networkType: 'public',
      confidence: 'range',
      enriched: false,
    });
    expect(lookupIpLocation('bad-ip')).toMatchObject({
      ip: 'bad-ip',
      location: 'Unknown',
      networkType: 'unknown',
      confidence: 'none',
      enriched: false,
    });
  });

  it('reports the offline IP location provider status', () => {
    expect(getIpLocationProviderStatus('2026-06-14T00:00:00.000Z')).toEqual({
      provider: 'opencore.builtin',
      mode: 'offline',
      ready: true,
      externalLookupEnabled: false,
      datasetVersion: 'builtin-cidr-v1',
      supportedNetworks: [
        'documentation',
        'link-local',
        'loopback',
        'private',
        'public',
        'shared',
        'unknown',
      ],
      checkedAt: '2026-06-14T00:00:00.000Z',
    });
  });
});

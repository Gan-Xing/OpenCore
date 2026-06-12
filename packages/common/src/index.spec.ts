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
});

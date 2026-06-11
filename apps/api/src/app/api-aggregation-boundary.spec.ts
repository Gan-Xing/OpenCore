import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const API_SRC_ROOT = join(process.cwd(), 'src');

describe('API aggregation boundary', () => {
  it('keeps reusable platform runtime outside apps/api platform shims', () => {
    const platformRoot = join(API_SRC_ROOT, 'platform');
    const entries = existsSync(platformRoot)
      ? readdirSync(platformRoot, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort()
      : [];

    expect(entries).toEqual(['config', 'openapi']);
  });

  it('keeps the API app focused on bootstrap, aggregation, modules, and assets', () => {
    const entries = readdirSync(API_SRC_ROOT, { withFileTypes: true })
      .map((entry) => entry.name)
      .sort();

    expect(entries).toEqual([
      'app',
      'assets',
      'main.ts',
      'modules',
      'platform',
    ]);
  });
});

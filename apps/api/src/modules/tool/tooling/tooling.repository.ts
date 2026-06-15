import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { isIP } from 'node:net';
import { dirname, resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import {
  createApiErrorBody,
  lookupIpLocation,
  normalizeIpAddress,
} from '@opencore/common';
import {
  CURRENT_PAGE_EXPORT_PROTOCOL,
  createCurrentPageExportPlan,
} from '@opencore/contracts';
import {
  PrismaService,
  type PrismaTransactionClient,
} from '@opencore/database';
import {
  applyOpenForge,
  buildDiffPlan,
  buildGeneratePlan,
  buildPreflightReport,
  getOpenForgeGeneratorCoreStatus,
  listOpenForgeManifests,
  rollbackOpenForge,
  runOpenForgeDoctor,
  showOpenForgeManifest,
} from '@opencore/generator-core';
import { getOpenForgeWorkspaceStatus } from '@opencore/openforge';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const DEFAULT_OPENFORGE_SCHEMA_PATH =
  'tools/generator/examples/core.dict.v1.schema.json';
const DEFAULT_OPENFORGE_CONFIG_PATH =
  'tools/generator/examples/openforge.v1.config.json';
const ALLOWED_OPENFORGE_SCHEMA_PREFIX = 'tools/generator/examples/';
const OPENFORGE_MANIFEST_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;
const OPENFORGE_DRY_RUN_CONFIRMATION_TEXT = 'OPENFORGE DRY RUN';
const OPENAPI_SNAPSHOT_PATH = 'packages/contracts/openapi/opencore-api.json';
const AREA_DATASET_MAX_ENTRIES = 500;
const AREA_DATASET_MAX_DEPTH = 6;
const AREA_DATASET_MAX_ALIASES = 8;
const AREA_DATASET_MAX_IP_RANGES_PER_REGION = 16;
const AREA_DATASET_VERSION_PATTERN = /^[a-zA-Z0-9._:-]{3,80}$/;
const AREA_REGION_CODE_PATTERN = /^[a-zA-Z0-9._:-]{2,32}$/;
const OPENAPI_HTTP_METHODS = new Set([
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'trace',
]);
const AREA_DATASET_INCLUDE = {
  ipRanges: {
    orderBy: [{ regionCode: 'asc' }, { start: 'asc' }],
  },
  regions: {
    orderBy: [{ code: 'asc' }],
  },
} satisfies Prisma.AreaDatasetVersionInclude;

function toolingBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

function toolingNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

type AreaDatasetImportEntryInput = {
  aliases?: readonly string[];
  code?: string;
  ipRanges?: readonly string[];
  name?: string;
  parentCode?: string;
};

type AreaDatasetImportInput = {
  dryRun?: boolean;
  entries?: readonly AreaDatasetImportEntryInput[];
  source?: string;
  version?: string;
};

type AreaRegionQueryInput = {
  limit?: number | string;
  parentCode?: string;
  query?: string;
};

type AreaIpRangeRecord = {
  cidr: string;
  end: number;
  endIp: string;
  start: number;
  startIp: string;
};

type AreaRegionRecord = {
  aliases: readonly string[];
  code: string;
  ipRanges: readonly AreaIpRangeRecord[];
  level: number;
  name: string;
  parentCode: string | null;
  path: readonly string[];
};

type AreaDatasetRecord = {
  checksum: string;
  importedAt: string;
  regions: readonly AreaRegionRecord[];
  source: string;
  version: string;
};

type PersistedAreaDatasetRow = {
  checksum: string;
  importedAt: Date;
  ipRanges: readonly {
    cidr: string;
    end: bigint;
    endIp: string;
    regionCode: string;
    start: bigint;
    startIp: string;
  }[];
  regions: readonly {
    aliases: unknown;
    code: string;
    level: number;
    name: string;
    parentCode: string | null;
    path: unknown;
  }[];
  source: string;
  version: string;
};

const BUILTIN_AREA_IMPORT = {
  version: 'opencore-area-boundary-v1',
  source: 'builtin-opencore',
  entries: [
    {
      code: '000000',
      name: 'Global',
      aliases: ['all'],
    },
    {
      code: 'RFC-EXAMPLE',
      name: 'RFC example networks',
      parentCode: '000000',
      aliases: ['documentation', 'example'],
      ipRanges: ['192.0.2.0/24', '198.51.100.0/24', '203.0.113.0/24'],
    },
    {
      code: 'US',
      name: 'United States',
      parentCode: '000000',
      aliases: ['USA', 'United States of America'],
    },
    {
      code: 'US-CA',
      name: 'California',
      parentCode: 'US',
      aliases: ['CA'],
    },
    {
      code: 'US-CA-SFO',
      name: 'San Francisco',
      parentCode: 'US-CA',
      aliases: ['SFO'],
    },
    {
      code: 'CN',
      name: 'China',
      parentCode: '000000',
      aliases: ['PRC'],
    },
    {
      code: 'CN-SH',
      name: 'Shanghai',
      parentCode: 'CN',
      aliases: ['沪'],
    },
  ],
} as const satisfies AreaDatasetImportInput;

function findWorkspaceRoot(start = process.cwd()): string {
  let current = resolve(start);

  for (;;) {
    if (
      existsSync(resolve(current, 'package.json')) &&
      existsSync(resolve(current, 'pnpm-workspace.yaml'))
    ) {
      return current;
    }

    const parent = dirname(current);

    if (parent === current) {
      return resolve(start);
    }

    current = parent;
  }
}

function rejectUnsafeRepoPath(path: string, label: string): void {
  if (
    !path ||
    path.startsWith('/') ||
    path.includes('\0') ||
    path.split('/').includes('..')
  ) {
    throw toolingBadRequest(
      'TOOL_OPENFORGE_REPO_PATH_INVALID',
      `${label} must be a safe repo-relative path.`,
      { label },
    );
  }
}

function normalizeOpenForgeSchemaPath(schemaPath?: string): string {
  const normalized = schemaPath?.trim() || DEFAULT_OPENFORGE_SCHEMA_PATH;

  rejectUnsafeRepoPath(normalized, 'schemaPath');

  if (
    !normalized.startsWith(ALLOWED_OPENFORGE_SCHEMA_PREFIX) ||
    !normalized.endsWith('.schema.json')
  ) {
    throw toolingBadRequest(
      'TOOL_OPENFORGE_SCHEMA_PATH_INVALID',
      'schemaPath must point to an OpenForge example schema.',
      { schemaPath: normalized },
    );
  }

  return normalized;
}

function normalizeOpenForgeConfigPath(configPath?: string): string | undefined {
  const normalized = configPath?.trim();

  if (!normalized) {
    return undefined;
  }

  rejectUnsafeRepoPath(normalized, 'configPath');

  if (normalized !== DEFAULT_OPENFORGE_CONFIG_PATH) {
    throw toolingBadRequest(
      'TOOL_OPENFORGE_CONFIG_PATH_INVALID',
      'configPath must point to the OpenForge example config.',
      { configPath: normalized },
    );
  }

  return normalized;
}

function manifestPathFromId(manifestId: string): string {
  const normalized = manifestId.trim();

  if (!OPENFORGE_MANIFEST_ID_PATTERN.test(normalized)) {
    throw toolingBadRequest(
      'TOOL_OPENFORGE_MANIFEST_ID_INVALID',
      'manifestId may contain only letters, numbers, dot, underscore and dash.',
      { manifestId },
    );
  }

  return `.openforge/manifests/${normalized.replace(/\.json$/, '')}.json`;
}

function assertOpenForgeDryRunConfirmation(input: {
  confirmationText?: string;
  requestedMode?: string;
}): void {
  if (input.requestedMode && input.requestedMode !== 'dry-run') {
    throw toolingBadRequest(
      'TOOL_OPENFORGE_WRITE_MODE_FORBIDDEN',
      'OpenForge API only supports dry-run operations; direct code writes require explicit user admission.',
      { requestedMode: input.requestedMode },
    );
  }

  if (input.confirmationText !== OPENFORGE_DRY_RUN_CONFIRMATION_TEXT) {
    throw toolingBadRequest(
      'TOOL_OPENFORGE_DRY_RUN_CONFIRMATION_REQUIRED',
      `OpenForge dry-run requires confirmationText "${OPENFORGE_DRY_RUN_CONFIRMATION_TEXT}".`,
      { expectedConfirmationText: OPENFORGE_DRY_RUN_CONFIRMATION_TEXT },
    );
  }
}

class AreaDatasetStore {
  private active = createAreaDataset(BUILTIN_AREA_IMPORT, {
    importedAt: '2026-01-01T00:00:00.000Z',
  });
  private readonly versions = new Map<string, AreaDatasetRecord>([
    [this.active.version, this.active],
  ]);

  getStatus() {
    return toAreaDatasetSummary(this.active);
  }

  listVersions() {
    return {
      activeVersion: this.active.version,
      versions: [...this.versions.values()]
        .map((dataset) => ({
          ...toAreaDatasetSummary(dataset),
          active: dataset.version === this.active.version,
        }))
        .sort((left, right) => right.importedAt.localeCompare(left.importedAt)),
    };
  }

  activateVersion(version: string) {
    const normalized = normalizeAreaDatasetVersion(version);
    const dataset = this.versions.get(normalized);

    if (!dataset) {
      throw toolingNotFound(
        'TOOL_AREA_DATASET_VERSION_NOT_FOUND',
        `Area dataset version ${normalized} was not found.`,
        { version: normalized },
      );
    }

    this.active = dataset;
    return {
      activated: true,
      dataset: toAreaDatasetSummary(dataset),
    };
  }

  listRegions(input: AreaRegionQueryInput = {}) {
    return listAreaRegionsFromDataset(this.active, input);
  }

  getRegion(code: string) {
    return getAreaRegionFromDataset(this.active, code);
  }

  lookupIp(input: { ip?: string }) {
    return lookupAreaIpFromDataset(this.active, input);
  }

  importDataset(input: AreaDatasetImportInput) {
    const dryRun = input.dryRun !== false;
    const dataset = createAreaDataset(input);
    const warnings = createAreaDatasetWarnings(dataset);

    if (!dryRun) {
      this.active = dataset;
      this.versions.set(dataset.version, dataset);
    }

    return {
      dryRun,
      applied: !dryRun,
      dataset: toAreaDatasetSummary(dataset),
      warnings,
    };
  }
}

function listAreaRegionsFromDataset(
  dataset: AreaDatasetRecord,
  input: AreaRegionQueryInput = {},
) {
  const limit = clampAreaListLimit(input.limit);
  const query = input.query?.trim().toLowerCase();
  const parentCode = normalizeOptionalAreaCode(input.parentCode);
  const items = dataset.regions.filter((region) => {
    if (parentCode && region.parentCode !== parentCode) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      region.code,
      region.name,
      region.parentCode ?? '',
      ...region.aliases,
      ...region.path,
    ].some((value) => value.toLowerCase().includes(query));
  });

  return {
    datasetVersion: dataset.version,
    total: items.length,
    limit,
    items: items.slice(0, limit).map(toAreaRegionDto),
  };
}

function getAreaRegionFromDataset(dataset: AreaDatasetRecord, code: string) {
  const normalized = normalizeRequiredAreaCode(code, 'code');
  const region = dataset.regions.find(
    (candidate) => candidate.code === normalized,
  );

  if (!region) {
    throw toolingNotFound(
      'TOOL_AREA_REGION_NOT_FOUND',
      `Area region ${normalized} was not found.`,
      { code: normalized },
    );
  }

  return toAreaRegionDto(region);
}

function lookupAreaIpFromDataset(
  dataset: AreaDatasetRecord,
  input: { ip?: string },
) {
  const ip = input.ip?.trim() ?? '';
  const normalizedIp = normalizeIpAddress(ip);

  if (!normalizedIp || isIP(normalizedIp) === 0) {
    throw toolingBadRequest(
      'TOOL_AREA_IP_INVALID',
      'ip must be a valid IP address.',
      { ip },
    );
  }

  const providerResult = lookupIpLocation(normalizedIp);
  const ipNumber = parseIpv4Number(normalizedIp);
  const match =
    typeof ipNumber === 'number'
      ? findAreaIpRangeMatch(dataset, ipNumber)
      : undefined;

  return {
    ip,
    normalizedIp,
    networkType: providerResult.networkType,
    location: providerResult.location,
    datasetVersion: dataset.version,
    matched: Boolean(match),
    region: match ? toAreaRegionDto(match.region) : null,
    range: match ? toAreaIpRangeDto(match.range) : null,
  };
}

function createAreaDataset(
  input: AreaDatasetImportInput,
  options: { importedAt?: string } = {},
): AreaDatasetRecord {
  const version = normalizeAreaDatasetVersion(input.version);
  const source = normalizeAreaDatasetSource(input.source);
  const entries = normalizeAreaDatasetEntries(input.entries);
  const byCode = new Map(entries.map((entry) => [entry.code, entry]));
  const pathCache = new Map<string, readonly string[]>();
  const regions = entries
    .map((entry) => {
      const path = resolveAreaPath(entry.code, byCode, pathCache);
      return {
        aliases: entry.aliases,
        code: entry.code,
        ipRanges: entry.ipRanges,
        level: path.length,
        name: entry.name,
        parentCode: entry.parentCode,
        path,
      } satisfies AreaRegionRecord;
    })
    .sort((left, right) => left.code.localeCompare(right.code));

  const maxDepth = Math.max(...regions.map((region) => region.level));
  if (maxDepth > AREA_DATASET_MAX_DEPTH) {
    throw toolingBadRequest(
      'TOOL_AREA_DATASET_DEPTH_TOO_DEEP',
      `Area dataset depth must not exceed ${AREA_DATASET_MAX_DEPTH}.`,
      { maxDepth, maxAllowedDepth: AREA_DATASET_MAX_DEPTH },
    );
  }

  return {
    checksum: createAreaDatasetChecksum({ regions, source, version }),
    importedAt: options.importedAt ?? new Date().toISOString(),
    regions,
    source,
    version,
  };
}

function normalizeAreaDatasetVersion(version: unknown): string {
  if (
    typeof version !== 'string' ||
    !AREA_DATASET_VERSION_PATTERN.test(version)
  ) {
    throw toolingBadRequest(
      'TOOL_AREA_DATASET_VERSION_INVALID',
      'version must be 3-80 characters and may contain letters, numbers, dot, underscore, colon or dash.',
    );
  }

  return version;
}

function normalizeAreaDatasetSource(source: unknown): string {
  if (typeof source !== 'string') {
    throw toolingBadRequest(
      'TOOL_AREA_DATASET_SOURCE_REQUIRED',
      'source is required.',
    );
  }

  const normalized = source.trim();
  if (!normalized || normalized.length > 120) {
    throw toolingBadRequest(
      'TOOL_AREA_DATASET_SOURCE_INVALID',
      'source must be 1-120 characters.',
      { maxLength: 120 },
    );
  }

  return normalized;
}

function normalizeAreaDatasetEntries(
  entries: AreaDatasetImportInput['entries'],
) {
  if (!Array.isArray(entries)) {
    throw toolingBadRequest(
      'TOOL_AREA_DATASET_ENTRIES_INVALID',
      'entries must be an array.',
    );
  }

  if (entries.length === 0 || entries.length > AREA_DATASET_MAX_ENTRIES) {
    throw toolingBadRequest(
      'TOOL_AREA_DATASET_ENTRIES_SIZE_INVALID',
      `entries must contain 1-${AREA_DATASET_MAX_ENTRIES} regions.`,
      { maxEntries: AREA_DATASET_MAX_ENTRIES, minEntries: 1 },
    );
  }

  const seenCodes = new Set<string>();
  const normalized = entries.map((entry, index) => {
    const code = normalizeRequiredAreaCode(
      entry.code,
      `entries[${index}].code`,
    );
    const parentCode = normalizeOptionalAreaCode(entry.parentCode);
    if (parentCode === code) {
      throw toolingBadRequest(
        'TOOL_AREA_REGION_PARENT_SELF',
        `Area region ${code} cannot parent itself.`,
        { code },
      );
    }

    if (seenCodes.has(code)) {
      throw toolingBadRequest(
        'TOOL_AREA_REGION_CODE_DUPLICATED',
        `Duplicate area region code ${code}.`,
        { code },
      );
    }
    seenCodes.add(code);

    return {
      aliases: normalizeAreaAliases(entry.aliases, code),
      code,
      ipRanges: normalizeAreaIpRanges(entry.ipRanges, code),
      name: normalizeAreaName(entry.name, code),
      parentCode,
    };
  });

  const codes = new Set(normalized.map((entry) => entry.code));
  for (const entry of normalized) {
    if (entry.parentCode && !codes.has(entry.parentCode)) {
      throw toolingBadRequest(
        'TOOL_AREA_REGION_PARENT_NOT_FOUND',
        `Area region ${entry.code} references missing parentCode ${entry.parentCode}.`,
        { code: entry.code, parentCode: entry.parentCode },
      );
    }
  }

  return normalized;
}

function normalizeRequiredAreaCode(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw toolingBadRequest(
      'TOOL_AREA_REGION_CODE_REQUIRED',
      `${label} is required.`,
      { label },
    );
  }

  const normalized = value.trim();
  if (!AREA_REGION_CODE_PATTERN.test(normalized)) {
    throw toolingBadRequest(
      'TOOL_AREA_REGION_CODE_INVALID',
      `${label} must be 2-32 characters and may contain letters, numbers, dot, underscore, colon or dash.`,
      { label },
    );
  }

  return normalized;
}

function normalizeOptionalAreaCode(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return normalizeRequiredAreaCode(value, 'parentCode');
}

function normalizeAreaName(value: unknown, code: string): string {
  if (typeof value !== 'string') {
    throw toolingBadRequest(
      'TOOL_AREA_REGION_NAME_REQUIRED',
      `Area region ${code} name is required.`,
      { code },
    );
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > 120) {
    throw toolingBadRequest(
      'TOOL_AREA_REGION_NAME_INVALID',
      `Area region ${code} name must be 1-120 characters.`,
      { code, maxLength: 120 },
    );
  }

  return normalized;
}

function normalizeAreaAliases(value: unknown, code: string): readonly string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw toolingBadRequest(
      'TOOL_AREA_REGION_ALIASES_INVALID',
      `Area region ${code} aliases must be an array.`,
      { code },
    );
  }

  if (value.length > AREA_DATASET_MAX_ALIASES) {
    throw toolingBadRequest(
      'TOOL_AREA_REGION_ALIASES_TOO_MANY',
      `Area region ${code} may declare at most ${AREA_DATASET_MAX_ALIASES} aliases.`,
      { code, maxAliases: AREA_DATASET_MAX_ALIASES },
    );
  }

  return value.map((alias, index) => {
    if (typeof alias !== 'string') {
      throw toolingBadRequest(
        'TOOL_AREA_REGION_ALIAS_INVALID_TYPE',
        `Area region ${code} aliases[${index}] must be a string.`,
        { code, index },
      );
    }

    const normalized = alias.trim();
    if (!normalized || normalized.length > 80) {
      throw toolingBadRequest(
        'TOOL_AREA_REGION_ALIAS_INVALID',
        `Area region ${code} aliases[${index}] must be 1-80 characters.`,
        { code, index, maxLength: 80 },
      );
    }

    return normalized;
  });
}

function normalizeAreaIpRanges(
  value: unknown,
  code: string,
): readonly AreaIpRangeRecord[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw toolingBadRequest(
      'TOOL_AREA_REGION_IP_RANGES_INVALID',
      `Area region ${code} ipRanges must be an array.`,
      { code },
    );
  }

  if (value.length > AREA_DATASET_MAX_IP_RANGES_PER_REGION) {
    throw toolingBadRequest(
      'TOOL_AREA_REGION_IP_RANGES_TOO_MANY',
      `Area region ${code} may declare at most ${AREA_DATASET_MAX_IP_RANGES_PER_REGION} IP ranges.`,
      { code, maxIpRanges: AREA_DATASET_MAX_IP_RANGES_PER_REGION },
    );
  }

  return value.map((range, index) => {
    if (typeof range !== 'string') {
      throw toolingBadRequest(
        'TOOL_AREA_REGION_IP_RANGE_INVALID_TYPE',
        `Area region ${code} ipRanges[${index}] must be a string.`,
        { code, index },
      );
    }

    return parseAreaIpRange(range, `Area region ${code} ipRanges[${index}]`);
  });
}

function resolveAreaPath(
  code: string,
  entries: ReadonlyMap<string, { code: string; parentCode: string | null }>,
  cache: Map<string, readonly string[]>,
  stack: readonly string[] = [],
): readonly string[] {
  const cached = cache.get(code);
  if (cached) {
    return cached;
  }

  if (stack.includes(code)) {
    throw toolingBadRequest(
      'TOOL_AREA_DATASET_PARENT_CYCLE',
      `Area dataset contains a parent cycle at ${code}.`,
      { code },
    );
  }

  const entry = entries.get(code);
  if (!entry) {
    throw toolingBadRequest(
      'TOOL_AREA_REGION_NOT_FOUND',
      `Area region ${code} was not found.`,
      { code },
    );
  }

  const path = entry.parentCode
    ? [
        ...resolveAreaPath(entry.parentCode, entries, cache, [...stack, code]),
        code,
      ]
    : [code];

  cache.set(code, path);
  return path;
}

function parseAreaIpRange(value: string, label: string): AreaIpRangeRecord {
  const normalized = value.trim();
  if (!normalized) {
    throw toolingBadRequest(
      'TOOL_AREA_IP_RANGE_EMPTY',
      `${label} must not be empty.`,
      { label },
    );
  }

  const parts = normalized.split('/');
  if (parts.length > 2) {
    throw toolingBadRequest(
      'TOOL_AREA_IP_RANGE_FORMAT_INVALID',
      `${label} must use IPv4 CIDR or exact IPv4.`,
      { label },
    );
  }

  const [ip, prefixPart] = parts;
  const startIp = normalizeIpAddress(ip ?? '');
  if (!startIp || isIP(startIp) !== 4) {
    throw toolingBadRequest(
      'TOOL_AREA_IP_RANGE_FORMAT_INVALID',
      `${label} must use IPv4 CIDR or exact IPv4.`,
      { label },
    );
  }

  const prefix =
    prefixPart === undefined ? 32 : Number.parseInt(prefixPart.trim(), 10);
  if (prefixPart !== undefined && !/^\d{1,2}$/.test(prefixPart.trim())) {
    throw toolingBadRequest(
      'TOOL_AREA_IP_RANGE_PREFIX_INVALID',
      `${label} CIDR prefix must be 0-32.`,
      { label },
    );
  }
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw toolingBadRequest(
      'TOOL_AREA_IP_RANGE_PREFIX_INVALID',
      `${label} CIDR prefix must be 0-32.`,
      { label },
    );
  }

  const startNumber = parseIpv4Number(startIp);
  if (typeof startNumber !== 'number') {
    throw toolingBadRequest(
      'TOOL_AREA_IP_RANGE_ADDRESS_INVALID',
      `${label} must use a valid IPv4 address.`,
      { label },
    );
  }

  const blockSize = 2 ** (32 - prefix);
  const networkStart = Math.floor(startNumber / blockSize) * blockSize;
  const networkEnd = networkStart + blockSize - 1;
  const cidr =
    prefix === 32
      ? numberToIpv4(networkStart)
      : `${numberToIpv4(networkStart)}/${prefix}`;

  return {
    cidr,
    end: networkEnd,
    endIp: numberToIpv4(networkEnd),
    start: networkStart,
    startIp: numberToIpv4(networkStart),
  };
}

function parseIpv4Number(value: string): number | undefined {
  if (isIP(value) !== 4) {
    return undefined;
  }

  const octets = value.split('.').map((part) => Number.parseInt(part, 10));
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return undefined;
  }

  return (
    octets[0] * 256 ** 3 + octets[1] * 256 ** 2 + octets[2] * 256 + octets[3]
  );
}

function numberToIpv4(value: number): string {
  return [
    Math.floor(value / 256 ** 3) % 256,
    Math.floor(value / 256 ** 2) % 256,
    Math.floor(value / 256) % 256,
    value % 256,
  ].join('.');
}

function findAreaIpRangeMatch(dataset: AreaDatasetRecord, ipNumber: number) {
  for (const region of dataset.regions) {
    for (const range of region.ipRanges) {
      if (ipNumber >= range.start && ipNumber <= range.end) {
        return { range, region };
      }
    }
  }

  return undefined;
}

function clampAreaListLimit(value: number | string | undefined): number {
  const parsed =
    typeof value === 'string' ? Number.parseInt(value, 10) : (value ?? 50);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

function toAreaDatasetSummary(dataset: AreaDatasetRecord) {
  const maxDepth = Math.max(...dataset.regions.map((region) => region.level));
  const ipRangeCount = dataset.regions.reduce(
    (total, region) => total + region.ipRanges.length,
    0,
  );

  return {
    status: 'active' as const,
    version: dataset.version,
    source: dataset.source,
    importedAt: dataset.importedAt,
    checksum: dataset.checksum,
    regionCount: dataset.regions.length,
    ipRangeCount,
    maxDepth,
    capabilities: [
      'versioned-area-dataset',
      'bounded-json-import',
      'hierarchical-region-query',
      'ipv4-range-lookup',
    ],
  };
}

function toAreaRegionDto(region: AreaRegionRecord) {
  return {
    code: region.code,
    name: region.name,
    parentCode: region.parentCode,
    level: region.level,
    path: region.path,
    aliases: region.aliases,
    ipRanges: region.ipRanges.map(toAreaIpRangeDto),
  };
}

function toAreaIpRangeDto(range: AreaIpRangeRecord) {
  return {
    cidr: range.cidr,
    startIp: range.startIp,
    endIp: range.endIp,
  };
}

function toPersistedAreaDatasetRecord(
  row: PersistedAreaDatasetRow,
): AreaDatasetRecord {
  const rangesByRegion = new Map<string, AreaIpRangeRecord[]>();
  for (const range of row.ipRanges) {
    const ranges = rangesByRegion.get(range.regionCode) ?? [];
    ranges.push({
      cidr: range.cidr,
      end: Number(range.end),
      endIp: range.endIp,
      start: Number(range.start),
      startIp: range.startIp,
    });
    rangesByRegion.set(range.regionCode, ranges);
  }

  return {
    checksum: row.checksum,
    importedAt: row.importedAt.toISOString(),
    regions: row.regions
      .map((region) => ({
        aliases: toPersistedStringArray(
          region.aliases,
          `Area region ${region.code} aliases`,
        ),
        code: region.code,
        ipRanges: rangesByRegion.get(region.code) ?? [],
        level: region.level,
        name: region.name,
        parentCode: region.parentCode,
        path: toPersistedStringArray(
          region.path,
          `Area region ${region.code} path`,
        ),
      }))
      .sort((left, right) => left.code.localeCompare(right.code)),
    source: row.source,
    version: row.version,
  };
}

function toPersistedStringArray(
  value: unknown,
  label: string,
): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must be stored as a string array.`);
  }

  return value;
}

async function persistAreaDataset(
  tx: PrismaTransactionClient,
  dataset: AreaDatasetRecord,
  options: { active: boolean },
): Promise<void> {
  await tx.areaDatasetVersion.upsert({
    where: { version: dataset.version },
    update: {
      active: options.active,
      checksum: dataset.checksum,
      importedAt: new Date(dataset.importedAt),
      source: dataset.source,
    },
    create: {
      active: options.active,
      checksum: dataset.checksum,
      importedAt: new Date(dataset.importedAt),
      source: dataset.source,
      version: dataset.version,
    },
  });

  await tx.areaIpRange.deleteMany({
    where: { datasetVersion: dataset.version },
  });
  await tx.areaRegion.deleteMany({
    where: { datasetVersion: dataset.version },
  });

  await tx.areaRegion.createMany({
    data: dataset.regions.map((region) => ({
      aliases: toInputJson([...region.aliases]),
      code: region.code,
      datasetVersion: dataset.version,
      level: region.level,
      name: region.name,
      parentCode: region.parentCode,
      path: toInputJson([...region.path]),
    })),
  });

  const ranges = dataset.regions.flatMap((region) =>
    region.ipRanges.map((range) => ({
      cidr: range.cidr,
      datasetVersion: dataset.version,
      end: BigInt(range.end),
      endIp: range.endIp,
      regionCode: region.code,
      start: BigInt(range.start),
      startIp: range.startIp,
    })),
  );

  if (ranges.length > 0) {
    await tx.areaIpRange.createMany({ data: ranges });
  }
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function createAreaDatasetChecksum(input: {
  regions: readonly AreaRegionRecord[];
  source: string;
  version: string;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        regions: input.regions.map((region) => ({
          aliases: region.aliases,
          code: region.code,
          ipRanges: region.ipRanges.map((range) => range.cidr),
          name: region.name,
          parentCode: region.parentCode,
        })),
        source: input.source,
        version: input.version,
      }),
    )
    .digest('hex');
}

function createAreaDatasetWarnings(
  dataset: AreaDatasetRecord,
): readonly string[] {
  const warnings: string[] = [];
  const hasIpRanges = dataset.regions.some(
    (region) => region.ipRanges.length > 0,
  );

  if (!hasIpRanges) {
    warnings.push('Dataset has no IP ranges; region queries will still work.');
  }

  return warnings;
}

@Injectable()
export class ToolingRepository {
  private readonly areaDatasetStore = new AreaDatasetStore();

  constructor(private readonly prisma?: PrismaService) {}

  private getOpenForgeRepoRoot(): string {
    return findWorkspaceRoot();
  }

  private async getActiveAreaDataset(): Promise<AreaDatasetRecord> {
    if (!this.prisma) {
      return createAreaDataset(BUILTIN_AREA_IMPORT, {
        importedAt: '2026-01-01T00:00:00.000Z',
      });
    }

    const active = await this.prisma.areaDatasetVersion.findFirst({
      where: { active: true },
      orderBy: [{ importedAt: 'desc' }, { version: 'asc' }],
      include: AREA_DATASET_INCLUDE,
    });

    if (active) {
      return toPersistedAreaDatasetRecord(active);
    }

    const builtin = createAreaDataset(BUILTIN_AREA_IMPORT, {
      importedAt: '2026-01-01T00:00:00.000Z',
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.areaDatasetVersion.updateMany({ data: { active: false } });
      await persistAreaDataset(tx, builtin, { active: true });
    });

    return builtin;
  }

  getOpenApiDriftStatus() {
    const checkedAt = new Date().toISOString();
    const snapshotPath = OPENAPI_SNAPSHOT_PATH;
    const absoluteSnapshotPath = resolve(
      this.getOpenForgeRepoRoot(),
      snapshotPath,
    );
    const base = {
      snapshotPath,
      exportCommand: 'pnpm openapi:export',
      driftCheckCommand: 'pnpm openapi:check',
      checkedAt,
    };

    if (!existsSync(absoluteSnapshotPath)) {
      return {
        ...base,
        status: 'missing' as const,
        snapshotExists: false,
        snapshotUpdatedAt: null,
        snapshotSha256: null,
        pathCount: 0,
        schemaCount: 0,
        operationCount: 0,
      };
    }

    const snapshot = readFileSync(absoluteSnapshotPath, 'utf8');

    try {
      const document = JSON.parse(snapshot) as {
        components?: { schemas?: Record<string, unknown> };
        paths?: Record<string, Record<string, unknown>>;
      };
      const pathCount = Object.keys(document.paths ?? {}).length;
      const schemaCount = Object.keys(
        document.components?.schemas ?? {},
      ).length;
      const operationCount = Object.values(document.paths ?? {}).reduce(
        (total, pathItem) =>
          total +
          Object.keys(pathItem ?? {}).filter((method) =>
            OPENAPI_HTTP_METHODS.has(method.toLowerCase()),
          ).length,
        0,
      );

      return {
        ...base,
        status: 'configured' as const,
        snapshotExists: true,
        snapshotUpdatedAt: statSync(absoluteSnapshotPath).mtime.toISOString(),
        snapshotSha256: createHash('sha256').update(snapshot).digest('hex'),
        pathCount,
        schemaCount,
        operationCount,
      };
    } catch {
      return {
        ...base,
        status: 'invalid' as const,
        snapshotExists: true,
        snapshotUpdatedAt: statSync(absoluteSnapshotPath).mtime.toISOString(),
        snapshotSha256: createHash('sha256').update(snapshot).digest('hex'),
        pathCount: 0,
        schemaCount: 0,
        operationCount: 0,
      };
    }
  }

  getExportProtocol() {
    return CURRENT_PAGE_EXPORT_PROTOCOL;
  }

  createExportPlan(input: {
    resource: string;
    columns: readonly string[];
    rowCount: number;
  }) {
    return createCurrentPageExportPlan(input);
  }

  async getAreaDatasetStatus() {
    if (this.prisma) {
      return toAreaDatasetSummary(await this.getActiveAreaDataset());
    }

    return this.areaDatasetStore.getStatus();
  }

  async listAreaDatasetVersions() {
    if (this.prisma) {
      await this.getActiveAreaDataset();
      const versions = await this.prisma.areaDatasetVersion.findMany({
        orderBy: [{ importedAt: 'desc' }, { version: 'asc' }],
        include: AREA_DATASET_INCLUDE,
      });
      const activeVersion =
        versions.find((version) => version.active)?.version ??
        BUILTIN_AREA_IMPORT.version;

      return {
        activeVersion,
        versions: versions.map((version) => ({
          ...toAreaDatasetSummary(toPersistedAreaDatasetRecord(version)),
          active: version.active,
        })),
      };
    }

    return this.areaDatasetStore.listVersions();
  }

  async activateAreaDatasetVersion(version: string) {
    if (this.prisma) {
      const normalized = normalizeAreaDatasetVersion(version);
      const dataset = await this.prisma.areaDatasetVersion.findUnique({
        where: { version: normalized },
        include: AREA_DATASET_INCLUDE,
      });

      if (!dataset) {
        throw toolingNotFound(
          'TOOL_AREA_DATASET_VERSION_NOT_FOUND',
          `Area dataset version ${normalized} was not found.`,
          { version: normalized },
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.areaDatasetVersion.updateMany({ data: { active: false } });
        await tx.areaDatasetVersion.update({
          where: { version: normalized },
          data: { active: true },
        });
      });

      return {
        activated: true,
        dataset: toAreaDatasetSummary(toPersistedAreaDatasetRecord(dataset)),
      };
    }

    return this.areaDatasetStore.activateVersion(version);
  }

  async listAreaRegions(query: AreaRegionQueryInput = {}) {
    if (this.prisma) {
      return listAreaRegionsFromDataset(
        await this.getActiveAreaDataset(),
        query,
      );
    }

    return this.areaDatasetStore.listRegions(query);
  }

  async getAreaRegion(code: string) {
    if (this.prisma) {
      return getAreaRegionFromDataset(await this.getActiveAreaDataset(), code);
    }

    return this.areaDatasetStore.getRegion(code);
  }

  async lookupAreaIp(input: { ip?: string }) {
    if (this.prisma) {
      return lookupAreaIpFromDataset(await this.getActiveAreaDataset(), input);
    }

    return this.areaDatasetStore.lookupIp(input);
  }

  async importAreaDataset(input: AreaDatasetImportInput) {
    if (this.prisma) {
      const dryRun = input.dryRun !== false;
      const dataset = createAreaDataset(input);
      const warnings = createAreaDatasetWarnings(dataset);

      if (!dryRun) {
        await this.prisma.$transaction(async (tx) => {
          await tx.areaDatasetVersion.updateMany({ data: { active: false } });
          await persistAreaDataset(tx, dataset, { active: true });
        });
      }

      return {
        dryRun,
        applied: !dryRun,
        dataset: toAreaDatasetSummary(dataset),
        warnings,
      };
    }

    return this.areaDatasetStore.importDataset(input);
  }

  getOpenForgeStatus() {
    return {
      status: 'workspace-ready' as const,
      workspace: getOpenForgeWorkspaceStatus(),
      generatorCore: getOpenForgeGeneratorCoreStatus(),
      operationPolicy: {
        dryRunOnly: true,
        confirmationText: OPENFORGE_DRY_RUN_CONFIRMATION_TEXT,
        writeRequiresUserAdmission: true,
      },
      message:
        'OpenForge is available as a guarded planning and dry-run workspace.',
    };
  }

  getOpenForgeDoctor() {
    return runOpenForgeDoctor({ repoRoot: this.getOpenForgeRepoRoot() });
  }

  createOpenForgePlan(input: { schemaPath?: string }) {
    const repoRoot = this.getOpenForgeRepoRoot();

    return buildGeneratePlan({
      schemaPath: normalizeOpenForgeSchemaPath(input.schemaPath),
      sourceRoot: repoRoot,
    });
  }

  createOpenForgeDiff(input: { schemaPath?: string }) {
    const repoRoot = this.getOpenForgeRepoRoot();

    return buildDiffPlan({
      schemaPath: normalizeOpenForgeSchemaPath(input.schemaPath),
      repoRoot,
      sourceRoot: repoRoot,
    });
  }

  createOpenForgePreflight(input: { schemaPath?: string }) {
    const repoRoot = this.getOpenForgeRepoRoot();

    return buildPreflightReport({
      schemaPath: normalizeOpenForgeSchemaPath(input.schemaPath),
      sourceRoot: repoRoot,
    });
  }

  createOpenForgeApplyDryRun(input: {
    confirmationText?: string;
    configPath?: string;
    requestedMode?: string;
    schemaPath?: string;
  }) {
    assertOpenForgeDryRunConfirmation(input);

    const repoRoot = this.getOpenForgeRepoRoot();
    const schemaPath = normalizeOpenForgeSchemaPath(input.schemaPath);
    const configPath = normalizeOpenForgeConfigPath(input.configPath);

    const result = applyOpenForge({
      schemaPath,
      configPath,
      mode: 'dry-run',
      yes: false,
      repoRoot,
      sourceRoot: repoRoot,
      command: [
        'pnpm openforge:apply --',
        '--schema',
        schemaPath,
        ...(configPath ? ['--config', configPath] : []),
        '--dry-run',
      ].join(' '),
    });

    return {
      ...result,
      mode: 'dry-run' as const,
      applied: false,
    };
  }

  createOpenForgeManifestPreview(input: {
    configPath?: string;
    schemaPath?: string;
  }) {
    const repoRoot = this.getOpenForgeRepoRoot();
    const schemaPath = normalizeOpenForgeSchemaPath(input.schemaPath);
    const configPath = normalizeOpenForgeConfigPath(input.configPath);
    const result = applyOpenForge({
      schemaPath,
      configPath,
      mode: 'dry-run',
      yes: false,
      repoRoot,
      sourceRoot: repoRoot,
      command: [
        'pnpm openforge:apply --',
        '--schema',
        schemaPath,
        ...(configPath ? ['--config', configPath] : []),
        '--dry-run',
      ].join(' '),
    });

    return {
      manifestPath: result.manifest ? `dry-run:${result.manifest.id}` : '',
      manifest: result.manifest,
      warnings: result.warnings,
      errors: result.errors,
    };
  }

  listOpenForgeManifests() {
    return listOpenForgeManifests({
      repoRoot: this.getOpenForgeRepoRoot(),
    });
  }

  getOpenForgeManifest(manifestId: string) {
    return showOpenForgeManifest({
      manifestIdOrPath: manifestPathFromId(manifestId),
      repoRoot: this.getOpenForgeRepoRoot(),
    });
  }

  createOpenForgeRollbackDryRun(input: {
    confirmationText?: string;
    manifestId: string;
    requestedMode?: string;
  }) {
    assertOpenForgeDryRunConfirmation(input);

    const manifestPath = manifestPathFromId(input.manifestId);

    const result = rollbackOpenForge({
      manifestPath,
      mode: 'dry-run',
      yes: false,
      repoRoot: this.getOpenForgeRepoRoot(),
      command: [
        'pnpm openforge:rollback --',
        '--manifest',
        manifestPath,
        '--dry-run',
      ].join(' '),
    });

    return {
      ...result,
      mode: 'dry-run' as const,
      rolledBack: false,
    };
  }
}

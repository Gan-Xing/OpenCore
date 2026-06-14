import { isIP } from 'node:net';

export type IpLocationCategory =
  | 'Documentation network'
  | 'Link-local'
  | 'Loopback'
  | 'Private network'
  | 'Public network'
  | 'Shared address space'
  | 'Unknown';

export type IpLocationNetworkType =
  | 'documentation'
  | 'link-local'
  | 'loopback'
  | 'private'
  | 'public'
  | 'shared'
  | 'unknown';

export type IpLocationLookupConfidence = 'exact' | 'none' | 'range';

export type IpLocationProviderCode = 'opencore.builtin' | 'opencore.http-json';

export type IpLocationProviderMode = 'external' | 'offline';

export type IpLocationLookupSource = 'builtin-cidr' | 'external-http-json';

export type IpLocationLookupResult = {
  ip: string;
  location: string;
  category: IpLocationCategory;
  networkType: IpLocationNetworkType;
  provider: IpLocationProviderCode;
  source: IpLocationLookupSource;
  confidence: IpLocationLookupConfidence;
  enriched: boolean;
  countryCode?: string;
  region?: string;
  city?: string;
  fallbackReason?: string;
};

export type IpLocationProviderStatus = {
  provider: IpLocationProviderCode;
  mode: IpLocationProviderMode;
  ready: boolean;
  externalLookupEnabled: boolean;
  datasetVersion: string;
  supportedNetworks: readonly IpLocationNetworkType[];
  checkedAt: string;
  endpointHost?: string;
  timeoutMs?: number;
  lastError?: string;
};

export type IpLocationProvider = {
  getStatus(checkedAt?: string): IpLocationProviderStatus;
  lookup(value: string): Promise<IpLocationLookupResult>;
};

export type IpLocationFetch = (
  url: string,
  init?: {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export type HttpJsonIpLocationProviderOptions = {
  endpointUrl?: string;
  allowedHosts?: readonly string[];
  timeoutMs?: number;
  datasetVersion?: string;
  authHeaderName?: string;
  authHeaderValue?: string;
  fetch?: IpLocationFetch;
};

const SUPPORTED_NETWORKS = [
  'documentation',
  'link-local',
  'loopback',
  'private',
  'public',
  'shared',
  'unknown',
] as const satisfies readonly IpLocationNetworkType[];

export function parseIpLocation(value: string): IpLocationCategory {
  return lookupIpLocation(value).category;
}

export function lookupIpLocation(value: string): IpLocationLookupResult {
  const ip = normalizeIpAddress(value);

  if (!ip || isIP(ip) === 0 || ip === '0.0.0.0' || ip === '::') {
    return createLookupResult(ip, 'Unknown');
  }

  const octets = parseIpv4Octets(ip);
  const location = octets ? parseIpv4Location(octets) : parseIpv6Location(ip);

  return createLookupResult(ip, location);
}

export function getIpLocationProviderStatus(
  checkedAt = new Date().toISOString(),
): IpLocationProviderStatus {
  return {
    provider: 'opencore.builtin',
    mode: 'offline',
    ready: true,
    externalLookupEnabled: false,
    datasetVersion: 'builtin-cidr-v1',
    supportedNetworks: SUPPORTED_NETWORKS,
    checkedAt,
  };
}

export function createBuiltinIpLocationProvider(): IpLocationProvider {
  return {
    getStatus: getIpLocationProviderStatus,
    lookup: async (value) => lookupIpLocation(value),
  };
}

export function createIpLocationProviderFromEnv(
  env: Record<string, string | undefined> = process.env,
): IpLocationProvider {
  const provider = normalizeConfigValue(env.OPENCORE_IP_LOCATION_PROVIDER);
  if (
    provider !== 'http-json' &&
    provider !== 'external-http-json' &&
    provider !== 'opencore.http-json'
  ) {
    return createBuiltinIpLocationProvider();
  }

  return createHttpJsonIpLocationProvider({
    endpointUrl:
      env.OPENCORE_IP_LOCATION_ENDPOINT_URL ?? env.OPENCORE_GEOIP_ENDPOINT_URL,
    allowedHosts: parseCsv(
      env.OPENCORE_IP_LOCATION_ALLOWED_HOSTS ??
        env.OPENCORE_GEOIP_ALLOWED_HOSTS,
    ),
    timeoutMs: parsePositiveInteger(env.OPENCORE_IP_LOCATION_TIMEOUT_MS, 3000),
    datasetVersion:
      env.OPENCORE_IP_LOCATION_DATASET_VERSION ?? 'external-http-json',
    authHeaderName: env.OPENCORE_IP_LOCATION_AUTH_HEADER_NAME,
    authHeaderValue: env.OPENCORE_IP_LOCATION_AUTH_HEADER_VALUE,
  });
}

export function createHttpJsonIpLocationProvider(
  options: HttpJsonIpLocationProviderOptions,
): IpLocationProvider {
  const endpoint = parseEndpoint(options.endpointUrl);
  const allowedHosts = new Set(
    (options.allowedHosts ?? [])
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
  const timeoutMs = clampTimeout(options.timeoutMs ?? 3000);
  const datasetVersion = options.datasetVersion?.trim() || 'external-http-json';
  const fetchImpl =
    options.fetch ?? (globalThis.fetch as IpLocationFetch | undefined);
  const configError = validateHttpJsonProviderConfig(
    endpoint,
    allowedHosts,
    fetchImpl,
  );

  return {
    getStatus: (checkedAt = new Date().toISOString()) => ({
      provider: 'opencore.http-json',
      mode: 'external',
      ready: !configError,
      externalLookupEnabled: !configError,
      datasetVersion,
      supportedNetworks: SUPPORTED_NETWORKS,
      checkedAt,
      endpointHost: endpoint?.hostname,
      timeoutMs,
      ...(configError ? { lastError: configError } : {}),
    }),
    lookup: async (value) => {
      const fallback = lookupIpLocation(value);
      if (fallback.networkType !== 'public') {
        return fallback;
      }

      if (!endpoint || configError || !fetchImpl) {
        return withFallbackReason(fallback, configError ?? 'Provider disabled');
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(
          createLookupUrl(endpoint, fallback.ip),
          {
            headers: createAuthHeaders(options),
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          return withFallbackReason(
            fallback,
            `Provider returned HTTP ${response.status}`,
          );
        }

        const payload = await response.json();
        return toExternalLookupResult(fallback, payload);
      } catch (error) {
        return withFallbackReason(fallback, sanitizeProviderError(error));
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export function normalizeIpAddress(value: string): string {
  const candidate = value.split(',')[0]?.trim() ?? '';
  const withoutBrackets =
    candidate.startsWith('[') && candidate.endsWith(']')
      ? candidate.slice(1, -1)
      : candidate;
  const withoutZone = withoutBrackets.split('%')[0] ?? '';

  if (withoutZone.startsWith('::ffff:')) {
    return withoutZone.slice('::ffff:'.length);
  }

  return withoutZone;
}

function parseIpv4Location(octets: readonly number[]): IpLocationCategory {
  const [first, second] = octets;

  if (first === 127) {
    return 'Loopback';
  }

  if (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  ) {
    return 'Private network';
  }

  if (first === 169 && second === 254) {
    return 'Link-local';
  }

  if (first === 100 && second >= 64 && second <= 127) {
    return 'Shared address space';
  }

  if (
    (first === 192 && second === 0 && octets[2] === 2) ||
    (first === 198 && second === 51 && octets[2] === 100) ||
    (first === 203 && second === 0 && octets[2] === 113)
  ) {
    return 'Documentation network';
  }

  return 'Public network';
}

function parseIpv6Location(ip: string): IpLocationCategory {
  const normalized = ip.toLowerCase();

  if (normalized === '::1') {
    return 'Loopback';
  }

  if (/^f[cd][0-9a-f]{2}:/u.test(normalized)) {
    return 'Private network';
  }

  if (/^fe[89ab][0-9a-f]:/u.test(normalized)) {
    return 'Link-local';
  }

  return 'Public network';
}

function parseIpv4Octets(ip: string): readonly number[] | undefined {
  const parts = ip.split('.');

  if (parts.length !== 4) {
    return undefined;
  }

  const octets = parts.map((part) => Number(part));
  if (
    octets.some(
      (octet, index) =>
        !Number.isInteger(octet) ||
        octet < 0 ||
        octet > 255 ||
        String(octet) !== parts[index],
    )
  ) {
    return undefined;
  }

  return octets;
}

function createLookupResult(
  ip: string,
  location: IpLocationCategory,
): IpLocationLookupResult {
  const networkType = toNetworkType(location);
  return {
    ip,
    location,
    category: location,
    networkType,
    provider: 'opencore.builtin',
    source: 'builtin-cidr',
    confidence: toLookupConfidence(networkType),
    enriched: !['public', 'unknown'].includes(networkType),
  };
}

function toExternalLookupResult(
  fallback: IpLocationLookupResult,
  payload: unknown,
): IpLocationLookupResult {
  const countryCode = firstStringAtPaths(payload, [
    'countryCode',
    'country_code',
    'country.isoCode',
    'country.iso_code',
    'location.countryCode',
    'location.country_code',
  ]);
  const country = firstStringAtPaths(payload, [
    'country',
    'country.name',
    'location.country',
  ]);
  const region = firstStringAtPaths(payload, [
    'region',
    'regionName',
    'region_name',
    'state',
    'location.region',
  ]);
  const city = firstStringAtPaths(payload, ['city', 'location.city']);
  const joinedLocation = [city, region, countryCode ?? country]
    .filter(Boolean)
    .join(', ');
  const location =
    firstStringAtPaths(payload, ['locationLabel', 'label', 'displayName']) ??
    (joinedLocation || fallback.location);

  if (!countryCode && !country && !region && !city) {
    return withFallbackReason(fallback, 'Provider response missing location');
  }

  return {
    ...fallback,
    location,
    provider: 'opencore.http-json',
    source: 'external-http-json',
    confidence: 'exact',
    enriched: true,
    ...(countryCode ? { countryCode } : {}),
    ...(region ? { region } : {}),
    ...(city ? { city } : {}),
  };
}

function withFallbackReason(
  fallback: IpLocationLookupResult,
  fallbackReason: string,
): IpLocationLookupResult {
  return {
    ...fallback,
    fallbackReason,
  };
}

function toNetworkType(location: IpLocationCategory): IpLocationNetworkType {
  switch (location) {
    case 'Documentation network':
      return 'documentation';
    case 'Link-local':
      return 'link-local';
    case 'Loopback':
      return 'loopback';
    case 'Private network':
      return 'private';
    case 'Public network':
      return 'public';
    case 'Shared address space':
      return 'shared';
    case 'Unknown':
      return 'unknown';
  }
}

function toLookupConfidence(
  networkType: IpLocationNetworkType,
): IpLocationLookupConfidence {
  if (networkType === 'unknown') {
    return 'none';
  }

  return networkType === 'loopback' ? 'exact' : 'range';
}

function parseEndpoint(value: string | undefined): URL | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed);
  } catch {
    return undefined;
  }
}

function validateHttpJsonProviderConfig(
  endpoint: URL | undefined,
  allowedHosts: ReadonlySet<string>,
  fetchImpl: IpLocationFetch | undefined,
): string | undefined {
  if (!endpoint) {
    return 'Endpoint URL is required';
  }

  if (!['http:', 'https:'].includes(endpoint.protocol)) {
    return 'Endpoint protocol must be HTTP or HTTPS';
  }

  if (allowedHosts.size === 0 || !allowedHosts.has(endpoint.hostname)) {
    return 'Endpoint host is not allowlisted';
  }

  if (!fetchImpl) {
    return 'Fetch runtime is unavailable';
  }

  return undefined;
}

function createLookupUrl(endpoint: URL, ip: string): string {
  if (endpoint.href.includes('{ip}')) {
    return endpoint.href.replaceAll('{ip}', encodeURIComponent(ip));
  }

  const url = new URL(endpoint.href);
  url.searchParams.set('ip', ip);
  return url.href;
}

function createAuthHeaders(
  options: HttpJsonIpLocationProviderOptions,
): Record<string, string> | undefined {
  const name = options.authHeaderName?.trim();
  const value = options.authHeaderValue?.trim();
  return name && value ? { [name]: value } : undefined;
}

function firstStringAtPaths(
  payload: unknown,
  paths: readonly string[],
): string | undefined {
  for (const path of paths) {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, payload);

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function parseCsv(value: string | undefined): readonly string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clampTimeout(value: number): number {
  return Math.min(Math.max(value, 250), 10_000);
}

function normalizeConfigValue(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function sanitizeProviderError(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'Provider request timed out';
  }

  return error instanceof Error && error.message
    ? error.message
    : 'Provider request failed';
}

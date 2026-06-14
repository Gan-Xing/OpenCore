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

export type IpLocationLookupResult = {
  ip: string;
  location: IpLocationCategory;
  category: IpLocationCategory;
  networkType: IpLocationNetworkType;
  provider: 'opencore.builtin';
  source: 'builtin-cidr';
  confidence: IpLocationLookupConfidence;
  enriched: boolean;
  countryCode?: string;
  region?: string;
  city?: string;
};

export type IpLocationProviderStatus = {
  provider: 'opencore.builtin';
  mode: 'offline';
  ready: true;
  externalLookupEnabled: false;
  datasetVersion: 'builtin-cidr-v1';
  supportedNetworks: readonly IpLocationNetworkType[];
  checkedAt: string;
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
  return lookupIpLocation(value).location;
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

import { isIP } from 'node:net';

export type IpLocationCategory =
  | 'Documentation network'
  | 'Link-local'
  | 'Loopback'
  | 'Private network'
  | 'Public network'
  | 'Shared address space'
  | 'Unknown';

export function parseIpLocation(value: string): IpLocationCategory {
  const ip = normalizeIpAddress(value);

  if (!ip || isIP(ip) === 0 || ip === '0.0.0.0' || ip === '::') {
    return 'Unknown';
  }

  const octets = parseIpv4Octets(ip);
  if (octets) {
    return parseIpv4Location(octets);
  }

  return parseIpv6Location(ip);
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

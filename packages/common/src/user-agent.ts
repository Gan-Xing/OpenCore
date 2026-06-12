export type ParsedUserAgent = {
  browser: string;
  os: string;
};

export function parseUserAgent(userAgent: string): ParsedUserAgent {
  return {
    browser: parseBrowser(userAgent),
    os: parseOs(userAgent),
  };
}

function parseBrowser(userAgent: string): string {
  if (/opencore[- ]smoke/iu.test(userAgent)) {
    return 'OpenCore Smoke';
  }
  if (/opencore[- ]admin/iu.test(userAgent)) {
    return 'OpenCore Admin';
  }
  if (/Edg\//u.test(userAgent)) {
    return 'Microsoft Edge';
  }
  if (/Chrome\//u.test(userAgent) && !/Chromium/u.test(userAgent)) {
    return 'Chrome';
  }
  if (/Firefox\//u.test(userAgent)) {
    return 'Firefox';
  }
  if (/Safari\//u.test(userAgent) && !/Chrome\//u.test(userAgent)) {
    return 'Safari';
  }
  if (/curl\//iu.test(userAgent)) {
    return 'curl';
  }
  if (/node|undici/iu.test(userAgent)) {
    return 'Node.js';
  }

  return 'Unknown';
}

function parseOs(userAgent: string): string {
  if (/Android/u.test(userAgent)) {
    return 'Android';
  }
  if (/iPhone|iPad|iOS/u.test(userAgent)) {
    return 'iOS';
  }
  if (/Windows NT/u.test(userAgent)) {
    return 'Windows';
  }
  if (/Mac OS X|Macintosh/u.test(userAgent)) {
    return 'macOS';
  }
  if (/Linux/u.test(userAgent)) {
    return 'Linux';
  }

  return 'Unknown';
}

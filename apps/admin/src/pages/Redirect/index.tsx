import { useEffect } from 'react';

const redirectPrefix = '/redirect';
const fallbackPath = '/404';
const defaultPath = '/dashboard';
const protocolPattern = /^[a-z][a-z\d+.-]*:/i;

export function getSafeRedirectTarget(
  pathname: string,
  search = '',
  hash = '',
): string {
  const rawPath = pathname.startsWith(redirectPrefix)
    ? pathname.slice(redirectPrefix.length)
    : '';
  const decodedPath = safeDecodePath(rawPath);

  if (!decodedPath) return appendSearchHash(defaultPath, search, hash);

  if (isUnsafeRedirectPath(decodedPath)) {
    return fallbackPath;
  }

  const normalizedPath = decodedPath.startsWith('/')
    ? decodedPath
    : `/${decodedPath}`;

  return appendSearchHash(normalizedPath, search, hash);
}

function safeDecodePath(path: string): string {
  try {
    return decodeURIComponent(path).trim();
  } catch (_error) {
    return '';
  }
}

function isUnsafeRedirectPath(path: string): boolean {
  const withoutLeadingSlash = path.replace(/^\/+/, '');

  return (
    path.startsWith('//') ||
    path.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(path) ||
    protocolPattern.test(withoutLeadingSlash)
  );
}

function appendSearchHash(path: string, search: string, hash: string): string {
  const safeSearch = search.startsWith('?') ? search : '';
  const safeHash = hash.startsWith('#') ? hash : '';

  return `${path}${safeSearch}${safeHash}`;
}

export default function RedirectPage() {
  useEffect(() => {
    window.location.replace(
      getSafeRedirectTarget(
        window.location.pathname,
        window.location.search,
        window.location.hash,
      ),
    );
  }, []);

  return null;
}

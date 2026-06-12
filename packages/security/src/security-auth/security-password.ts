import { createHash } from 'node:crypto';

export function hashSecurityPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function verifySecurityPassword(
  password: string,
  passwordHash: string,
): boolean {
  return hashSecurityPassword(password) === passwordHash;
}

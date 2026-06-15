import { PrismaSecurityLoginLockoutRepository } from './prisma-security-login-lockout.repository';

describe('PrismaSecurityLoginLockoutRepository validation', () => {
  const repository = new PrismaSecurityLoginLockoutRepository({} as never);

  it('returns stable error codes for invalid lockout inputs', async () => {
    await expectHttpExceptionCode(
      repository.getLoginLockout('   '),
      'SECURITY_LOGIN_USERNAME_REQUIRED',
    );
    await expectHttpExceptionCode(
      repository.recordFailedLoginAttempt({
        lockoutMinutes: 15,
        maxFailedAttempts: 0,
        username: 'admin',
      }),
      'SECURITY_LOGIN_LOCKOUT_POLICY_INVALID',
    );
    await expectHttpExceptionCode(
      repository.recordFailedLoginAttempt({
        lockoutMinutes: 15,
        maxFailedAttempts: 5,
        occurredAt: 'not-a-date',
        username: 'admin',
      }),
      'SECURITY_LOGIN_LOCKOUT_OCCURRED_AT_INVALID',
    );
  });
});

async function expectHttpExceptionCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  return undefined;
}

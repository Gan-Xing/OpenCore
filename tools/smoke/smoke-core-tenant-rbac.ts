#!/usr/bin/env node

import {
  assertDefined,
  assertIncludes,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { clients, login } = smoke;

async function main() {
  const session = await login();
  const token = assertString(session.accessToken, 'login accessToken');

  assertDefined(session.user.activeMembership, 'login active membership');
  assertIncludes(session.user.roleCodes, 'admin', 'login role codes');
  assertIncludes(session.user.postCodes, 'admin', 'login post codes');
  assertIncludes(
    session.user.permissionCodes,
    'core:dashboard:read',
    'login permission codes',
  );

  const me = await clients.rbac.me(token);

  assertDefined(me.user.activeMembership, 'me active membership');
  assertIncludes(me.user.roleCodes, 'admin', 'me role codes');
  assertIncludes(me.user.postCodes, 'admin', 'me post codes');
  assertIncludes(
    me.user.permissionCodes,
    'core:dashboard:read',
    'me permission codes',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

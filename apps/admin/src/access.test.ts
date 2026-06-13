import { describe, expect, it } from 'vitest';
import access from './access';

describe('access', () => {
  it('maps Permission.code values to route access helpers', () => {
    const result = access({
      permissions: [
        'core:dashboard:read',
        'core:user:manage',
        'core:user:export',
        'core:user:read',
        'monitor:status:read',
        'integration:provider:read',
      ],
    });

    expect(result.canAccessDashboard).toBe(true);
    expect(result.canAssignUserRoles).toBe(true);
    expect(result.canExportUsers).toBe(true);
    expect(result.canReadUsers).toBe(true);
    expect(result.canReadSystemStatus).toBe(true);
    expect(result.canReadIntegrationProviders).toBe(true);
    expect(result.canReadRoles).toBe(false);
  });

  it('does not grant formal routes without explicit permission codes', () => {
    const result = access(undefined);

    expect(result.canAccessDashboard).toBe(false);
    expect(result.canAssignUserRoles).toBe(false);
    expect(result.canExportUsers).toBe(false);
    expect(result.canReadUsers).toBe(false);
    expect(result.canReadOpenForge).toBe(false);
    expect(result.hasAllShellPermissions).toBe(false);
  });
});

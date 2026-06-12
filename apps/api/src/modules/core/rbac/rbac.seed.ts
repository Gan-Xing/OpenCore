import { collectPermissionDefinitions } from '@opencore/module-registry';

export const seedPermissions = collectPermissionDefinitions().map(
  (permission) => ({
    code: permission.code,
    title: permission.title,
    stage: permission.stage,
    dangerous: permission.dangerous ?? false,
    system: true,
  }),
);

import { MODULE_LAYERS, type ModuleLayer } from './module-contract';

export const PERMISSION_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'export',
  'import',
  'manage',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionCode = `${ModuleLayer}:${string}:${PermissionAction}`;

export type ParsedPermissionCode = {
  layer: ModuleLayer;
  resource: string;
  action: PermissionAction;
};

const RESOURCE_PATTERN = /^[a-z][a-z0-9-]*$/;

export function isModuleLayer(value: string): value is ModuleLayer {
  return (MODULE_LAYERS as readonly string[]).includes(value);
}

export function isPermissionAction(value: string): value is PermissionAction {
  return (PERMISSION_ACTIONS as readonly string[]).includes(value);
}

export function parsePermissionCode(code: string): ParsedPermissionCode | null {
  const parts = code.split(':');

  if (parts.length !== 3) {
    return null;
  }

  const [layer, resource, action] = parts;

  if (
    !isModuleLayer(layer) ||
    !RESOURCE_PATTERN.test(resource) ||
    !isPermissionAction(action)
  ) {
    return null;
  }

  return {
    layer,
    resource,
    action,
  };
}

export function isPermissionCode(value: string): value is PermissionCode {
  return parsePermissionCode(value) !== null;
}

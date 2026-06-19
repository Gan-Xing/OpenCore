import type { PermissionCode } from './permission-code';

export const MODULE_LAYERS = [
  'core',
  'system',
  'monitor',
  'tool',
  'collaboration',
  'optional',
  'integration',
  'industry',
  'ai',
  'experimental',
] as const;

export type ModuleLayer = (typeof MODULE_LAYERS)[number];

export const MODULE_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5'] as const;

export type ModulePriority = (typeof MODULE_PRIORITIES)[number];

export const MODULE_STAGES = [
  'S3',
  'S4',
  'S5',
  'S6',
  'S7',
  'S8',
  'S9',
  'S10',
  'S11',
  'S12',
  'backlog',
] as const;

export type ModuleStage = (typeof MODULE_STAGES)[number];

export const MODULE_STATUSES = [
  'draft',
  'planned',
  'active',
  'optional',
  'not_now',
] as const;

export type ModuleStatus = (typeof MODULE_STATUSES)[number];

export type PermissionDefinition = {
  code: PermissionCode;
  title: string;
  description?: string;
  stage: ModuleStage;
  dangerous?: boolean;
};

export const MENU_TYPES = ['directory', 'menu'] as const;

export type MenuType = (typeof MENU_TYPES)[number];

export const MENU_STATUSES = ['enabled', 'disabled'] as const;

export type MenuStatus = (typeof MENU_STATUSES)[number];

export type MenuDefinition = {
  key: string;
  title: string;
  path: `/${string}`;
  permissionCode?: PermissionCode;
  parentKey?: string;
  type?: MenuType;
  icon?: string;
  component?: string;
  order: number;
  stage: ModuleStage;
  status?: MenuStatus;
  cache?: boolean;
  hidden?: boolean;
};

export type AdminRouteContract = {
  path: `/${string}`;
  title: string;
  permissionCode?: PermissionCode;
};

export type AdminModuleContract = {
  basePath: `/${string}`;
  routes: readonly AdminRouteContract[];
};

export type ModuleDefinition = {
  code: `${ModuleLayer}.${string}`;
  title: string;
  layer: ModuleLayer;
  priority: ModulePriority;
  status: ModuleStatus;
  stage: ModuleStage;
  enabledByDefault: boolean;
  description: string;
  apiTags: readonly string[];
  permissions: readonly PermissionDefinition[];
  menus: readonly MenuDefinition[];
  admin?: AdminModuleContract;
  dependencies?: readonly `${ModuleLayer}.${string}`[];
};

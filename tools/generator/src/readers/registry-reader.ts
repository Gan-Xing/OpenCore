import {
  collectMenus,
  collectPermissionDefinitions,
  listModules,
  validateModuleRegistry,
} from '@opencore/module-registry';

export type OpenForgeRegistrySnapshot = {
  modules: ReturnType<typeof listModules>;
  permissions: ReturnType<typeof collectPermissionDefinitions>;
  menus: ReturnType<typeof collectMenus>;
  validation: ReturnType<typeof validateModuleRegistry>;
};

export function readModuleRegistrySnapshot(): OpenForgeRegistrySnapshot {
  return {
    modules: listModules(),
    permissions: collectPermissionDefinitions(),
    menus: collectMenus(),
    validation: validateModuleRegistry(),
  };
}

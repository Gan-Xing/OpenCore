import {
  combineValidationResults,
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from '@opencore/shared';
import {
  MODULE_LAYERS,
  MODULE_PRIORITIES,
  MODULE_STAGES,
  MODULE_STATUSES,
  MENU_STATUSES,
  MENU_TYPES,
  type MenuDefinition,
  type ModuleDefinition,
  type ModuleLayer,
  type PermissionDefinition,
} from './module-contract';
import { parsePermissionCode } from './permission-code';

const MODULE_CODE_PATTERN = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;
const MENU_KEY_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;
const MENU_PARENT_KEY_PATTERN = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/;

export function validatePermissionDefinition(
  permission: PermissionDefinition,
  options: {
    expectedLayer?: ModuleLayer;
    expectedResource?: string;
    path?: string;
  } = {},
): ValidationResult {
  const path = options.path ?? permission.code;
  const issues: ValidationIssue[] = [];
  const parsedCode = parsePermissionCode(permission.code);

  if (!parsedCode) {
    issues.push(
      createValidationIssue(
        `${path}.code`,
        'Permission code must match <module>:<resource>:<action>.',
      ),
    );
  }

  if (
    parsedCode &&
    options.expectedLayer &&
    parsedCode.layer !== options.expectedLayer &&
    !isCoreTenantPlatformPermission(parsedCode.layer, options)
  ) {
    issues.push(
      createValidationIssue(
        `${path}.code`,
        `Permission code layer must be ${options.expectedLayer}.`,
      ),
    );
  }

  if (
    parsedCode &&
    options.expectedResource &&
    parsedCode.resource !== options.expectedResource
  ) {
    issues.push(
      createValidationIssue(
        `${path}.code`,
        `Permission code resource must be ${options.expectedResource}.`,
      ),
    );
  }

  if (!permission.title.trim()) {
    issues.push(
      createValidationIssue(`${path}.title`, 'Permission title is required.'),
    );
  }

  if (!(MODULE_STAGES as readonly string[]).includes(permission.stage)) {
    issues.push(
      createValidationIssue(`${path}.stage`, 'Permission stage is invalid.'),
    );
  }

  return createValidationResult(issues);
}

function isCoreTenantPlatformPermission(
  parsedLayer: ModuleLayer,
  options: {
    expectedLayer?: ModuleLayer;
    expectedResource?: string;
  },
): boolean {
  return (
    options.expectedLayer === 'core' &&
    parsedLayer === 'platform' &&
    Boolean(options.expectedResource?.startsWith('tenant'))
  );
}

export function validateMenuDefinition(menu: MenuDefinition): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!MENU_KEY_PATTERN.test(menu.key)) {
    issues.push(
      createValidationIssue(
        `${menu.key}.key`,
        'Menu key must use dot-separated lowercase segments.',
      ),
    );
  }

  if (!menu.title.trim()) {
    issues.push(
      createValidationIssue(`${menu.key}.title`, 'Menu title is required.'),
    );
  }

  if (!menu.path.startsWith('/')) {
    issues.push(
      createValidationIssue(`${menu.key}.path`, 'Menu path must be absolute.'),
    );
  }

  if (menu.parentKey && !MENU_PARENT_KEY_PATTERN.test(menu.parentKey)) {
    issues.push(
      createValidationIssue(
        `${menu.key}.parentKey`,
        'Menu parent key must use lowercase segments.',
      ),
    );
  }

  if (menu.type && !(MENU_TYPES as readonly string[]).includes(menu.type)) {
    issues.push(
      createValidationIssue(`${menu.key}.type`, 'Menu type is invalid.'),
    );
  }

  if (menu.permissionCode && !parsePermissionCode(menu.permissionCode)) {
    issues.push(
      createValidationIssue(
        `${menu.key}.permissionCode`,
        'Menu permission code is invalid.',
      ),
    );
  }

  if (!Number.isInteger(menu.order) || menu.order < 0) {
    issues.push(
      createValidationIssue(
        `${menu.key}.order`,
        'Menu order must be a non-negative integer.',
      ),
    );
  }

  if (!(MODULE_STAGES as readonly string[]).includes(menu.stage)) {
    issues.push(
      createValidationIssue(`${menu.key}.stage`, 'Menu stage is invalid.'),
    );
  }

  if (
    menu.status &&
    !(MENU_STATUSES as readonly string[]).includes(menu.status)
  ) {
    issues.push(
      createValidationIssue(`${menu.key}.status`, 'Menu status is invalid.'),
    );
  }

  return createValidationResult(issues);
}

export function validateModuleDefinition(
  moduleDefinition: ModuleDefinition,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const [layer, resource] = moduleDefinition.code.split('.');

  if (!MODULE_CODE_PATTERN.test(moduleDefinition.code)) {
    issues.push(
      createValidationIssue(
        `${moduleDefinition.code}.code`,
        'Module code must match <layer>.<resource>.',
      ),
    );
  }

  if (!(MODULE_LAYERS as readonly string[]).includes(moduleDefinition.layer)) {
    issues.push(
      createValidationIssue(
        `${moduleDefinition.code}.layer`,
        'Module layer is invalid.',
      ),
    );
  }

  if (layer !== moduleDefinition.layer) {
    issues.push(
      createValidationIssue(
        `${moduleDefinition.code}.layer`,
        'Module layer must match code prefix.',
      ),
    );
  }

  if (
    !(MODULE_PRIORITIES as readonly string[]).includes(
      moduleDefinition.priority,
    )
  ) {
    issues.push(
      createValidationIssue(
        `${moduleDefinition.code}.priority`,
        'Module priority is invalid.',
      ),
    );
  }

  if (
    !(MODULE_STATUSES as readonly string[]).includes(moduleDefinition.status)
  ) {
    issues.push(
      createValidationIssue(
        `${moduleDefinition.code}.status`,
        'Module status is invalid.',
      ),
    );
  }

  if (!(MODULE_STAGES as readonly string[]).includes(moduleDefinition.stage)) {
    issues.push(
      createValidationIssue(
        `${moduleDefinition.code}.stage`,
        'Module stage is invalid.',
      ),
    );
  }

  if (!moduleDefinition.title.trim()) {
    issues.push(
      createValidationIssue(
        `${moduleDefinition.code}.title`,
        'Module title is required.',
      ),
    );
  }

  if (!moduleDefinition.description.trim()) {
    issues.push(
      createValidationIssue(
        `${moduleDefinition.code}.description`,
        'Module description is required.',
      ),
    );
  }

  if (moduleDefinition.apiTags.length === 0) {
    issues.push(
      createValidationIssue(
        `${moduleDefinition.code}.apiTags`,
        'At least one OpenAPI tag is required.',
      ),
    );
  }

  const permissionResults = moduleDefinition.permissions.map((permission) =>
    validatePermissionDefinition(permission, {
      expectedLayer: moduleDefinition.layer,
      expectedResource: resource,
      path: `${moduleDefinition.code}.permissions.${permission.code}`,
    }),
  );

  const menuResults = moduleDefinition.menus.map((menu) =>
    validateMenuDefinition(menu),
  );

  return combineValidationResults([
    createValidationResult(issues),
    ...permissionResults,
    ...menuResults,
  ]);
}

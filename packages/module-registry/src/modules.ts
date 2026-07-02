import type {
  MenuDefinition,
  ModuleDefinition,
  ModuleLayer,
  ModuleStage,
  PermissionAction,
  PermissionDefinition,
} from '@opencore/contracts';

type PermissionSeed = {
  action: PermissionAction;
  title: string;
  dangerous?: boolean;
};

const CRUD_PERMISSION_SEEDS: readonly PermissionSeed[] = [
  { action: 'read', title: 'Read' },
  { action: 'create', title: 'Create' },
  { action: 'update', title: 'Update' },
  { action: 'delete', title: 'Delete', dangerous: true },
  { action: 'export', title: 'Export' },
];

function definePermissions(
  layer: ModuleLayer,
  resource: string,
  resourceTitle: string,
  stage: ModuleStage,
  seeds: readonly PermissionSeed[],
): readonly PermissionDefinition[] {
  return seeds.map((seed) => ({
    code: `${layer}:${resource}:${seed.action}`,
    title: `${seed.title} ${resourceTitle}`,
    stage,
    dangerous: seed.dangerous,
  }));
}

function defineMenu(
  key: string,
  title: string,
  path: `/${string}`,
  permissionCode: PermissionDefinition['code'],
  order: number,
  stage: ModuleStage,
): MenuDefinition {
  return {
    key,
    title,
    path,
    permissionCode,
    order,
    stage,
  };
}

export const moduleRegistry = [
  {
    code: 'core.dashboard',
    title: 'Dashboard',
    layer: 'core',
    priority: 'P1',
    status: 'planned',
    stage: 'S5',
    enabledByDefault: true,
    description: 'Admin dashboard shell with health and empty-state summaries.',
    apiTags: ['Core Dashboard'],
    permissions: definePermissions('core', 'dashboard', 'dashboard', 'S5', [
      { action: 'read', title: 'Read' },
    ]),
    menus: [
      defineMenu(
        'dashboard.home',
        'Dashboard',
        '/dashboard',
        'core:dashboard:read',
        10,
        'S5',
      ),
    ],
    admin: {
      basePath: '/dashboard',
      routes: [
        {
          path: '/dashboard',
          title: 'Dashboard',
          permissionCode: 'core:dashboard:read',
        },
      ],
    },
  },
  {
    code: 'core.tenant',
    title: 'Tenants',
    layer: 'core',
    priority: 'P0',
    status: 'active',
    stage: 'S10',
    enabledByDefault: true,
    description: 'Platform tenant control-plane foundation.',
    apiTags: ['Core Tenancy'],
    permissions: definePermissions('platform', 'tenant', 'tenants', 'S10', [
      { action: 'read', title: 'Read' },
      { action: 'create', title: 'Create' },
      { action: 'update', title: 'Update' },
      { action: 'suspend', title: 'Suspend', dangerous: true },
      { action: 'visit', title: 'Visit', dangerous: true },
    ]),
    menus: [
      defineMenu(
        'system.tenants',
        'Tenants',
        '/system/tenants',
        'platform:tenant:read',
        90,
        'S10',
      ),
    ],
    admin: {
      basePath: '/system/tenants',
      routes: [
        {
          path: '/system/tenants',
          title: 'Tenants',
          permissionCode: 'platform:tenant:read',
        },
      ],
    },
  },
  {
    code: 'core.tenant-plan',
    title: 'Tenant Plans',
    layer: 'core',
    priority: 'P0',
    status: 'active',
    stage: 'S10',
    enabledByDefault: true,
    description: 'Tenant plan and module entitlement catalog foundation.',
    apiTags: ['Core Tenancy'],
    permissions: definePermissions(
      'platform',
      'tenant-plan',
      'tenant plans',
      'S10',
      [
        { action: 'read', title: 'Read' },
        { action: 'manage', title: 'Manage', dangerous: true },
      ],
    ),
    menus: [],
  },
  {
    code: 'core.tenant-member',
    title: 'Tenant Members',
    layer: 'core',
    priority: 'P0',
    status: 'active',
    stage: 'S10',
    enabledByDefault: true,
    description: 'Tenant membership status and assignment foundation.',
    apiTags: ['Core Tenancy'],
    permissions: definePermissions(
      'platform',
      'tenant-member',
      'tenant members',
      'S10',
      [
        { action: 'read', title: 'Read' },
        { action: 'manage', title: 'Manage', dangerous: true },
      ],
    ),
    menus: [],
  },
  {
    code: 'core.user',
    title: 'Users',
    layer: 'core',
    priority: 'P1',
    status: 'planned',
    stage: 'S6',
    enabledByDefault: true,
    description: 'User identity management for the minimal RBAC loop.',
    apiTags: ['Core Users'],
    permissions: definePermissions('core', 'user', 'users', 'S6', [
      ...CRUD_PERMISSION_SEEDS,
      { action: 'import', title: 'Import' },
      { action: 'manage', title: 'Assign roles to', dangerous: true },
    ]),
    menus: [
      defineMenu(
        'system.users',
        'Users',
        '/system/users',
        'core:user:read',
        100,
        'S6',
      ),
    ],
    admin: {
      basePath: '/system/users',
      routes: [
        {
          path: '/system/users',
          title: 'Users',
          permissionCode: 'core:user:read',
        },
      ],
    },
  },
  {
    code: 'core.role',
    title: 'Roles',
    layer: 'core',
    priority: 'P1',
    status: 'planned',
    stage: 'S6',
    enabledByDefault: true,
    description: 'Role management with stable Role.code identity.',
    apiTags: ['Core Roles'],
    permissions: definePermissions(
      'core',
      'role',
      'roles',
      'S6',
      CRUD_PERMISSION_SEEDS,
    ),
    menus: [
      defineMenu(
        'system.roles',
        'Roles',
        '/system/roles',
        'core:role:read',
        110,
        'S6',
      ),
    ],
    admin: {
      basePath: '/system/roles',
      routes: [
        {
          path: '/system/roles',
          title: 'Roles',
          permissionCode: 'core:role:read',
        },
      ],
    },
  },
  {
    code: 'core.permission',
    title: 'Permissions',
    layer: 'core',
    priority: 'P1',
    status: 'planned',
    stage: 'S6',
    enabledByDefault: true,
    description: 'Permission catalog backed by stable Permission.code values.',
    apiTags: ['Core Permissions'],
    permissions: definePermissions(
      'core',
      'permission',
      'permissions',
      'S6',
      CRUD_PERMISSION_SEEDS,
    ),
    menus: [
      defineMenu(
        'system.permissions',
        'Permissions',
        '/system/permissions',
        'core:permission:read',
        120,
        'S6',
      ),
    ],
    admin: {
      basePath: '/system/permissions',
      routes: [
        {
          path: '/system/permissions',
          title: 'Permissions',
          permissionCode: 'core:permission:read',
        },
      ],
    },
  },
  {
    code: 'core.menu',
    title: 'Menus',
    layer: 'core',
    priority: 'P1',
    status: 'planned',
    stage: 'S6',
    enabledByDefault: true,
    description: 'Admin menu management linked to permission codes.',
    apiTags: ['Core Menus'],
    permissions: definePermissions(
      'core',
      'menu',
      'menus',
      'S6',
      CRUD_PERMISSION_SEEDS,
    ),
    menus: [
      defineMenu(
        'system.menus',
        'Menus',
        '/system/menus',
        'core:menu:read',
        130,
        'S6',
      ),
    ],
    admin: {
      basePath: '/system/menus',
      routes: [
        {
          path: '/system/menus',
          title: 'Menus',
          permissionCode: 'core:menu:read',
        },
      ],
    },
  },
  {
    code: 'core.dict',
    title: 'Dictionaries',
    layer: 'core',
    priority: 'P2',
    status: 'planned',
    stage: 'S7',
    enabledByDefault: true,
    description: 'System dictionary types and values.',
    apiTags: ['Core Dictionaries'],
    permissions: definePermissions('core', 'dict', 'dictionaries', 'S7', [
      ...CRUD_PERMISSION_SEEDS,
      { action: 'manage', title: 'Manage' },
    ]),
    menus: [
      defineMenu(
        'system.dicts',
        'Dictionaries',
        '/system/dicts',
        'core:dict:read',
        200,
        'S7',
      ),
    ],
    admin: {
      basePath: '/system/dicts',
      routes: [
        {
          path: '/system/dicts',
          title: 'Dictionaries',
          permissionCode: 'core:dict:read',
        },
      ],
    },
  },
  {
    code: 'core.config',
    title: 'System Config',
    layer: 'core',
    priority: 'P2',
    status: 'planned',
    stage: 'S7',
    enabledByDefault: true,
    description: 'Safe runtime system parameters, excluding secrets.',
    apiTags: ['Core System Config'],
    permissions: definePermissions(
      'core',
      'config',
      'system config',
      'S7',
      CRUD_PERMISSION_SEEDS,
    ),
    menus: [
      defineMenu(
        'system.config',
        'System Config',
        '/system/config',
        'core:config:read',
        210,
        'S7',
      ),
    ],
    admin: {
      basePath: '/system/config',
      routes: [
        {
          path: '/system/config',
          title: 'System Config',
          permissionCode: 'core:config:read',
        },
      ],
    },
  },
  {
    code: 'core.notice',
    title: 'System Notices',
    layer: 'core',
    priority: 'P2',
    status: 'planned',
    stage: 'S7',
    enabledByDefault: true,
    description: 'System announcements with draft, publish and archive flow.',
    apiTags: ['Core System Notices'],
    permissions: definePermissions(
      'core',
      'notice',
      'system notices',
      'S7',
      CRUD_PERMISSION_SEEDS,
    ),
    menus: [
      defineMenu(
        'system.notices',
        'System Notices',
        '/system/notices',
        'core:notice:read',
        215,
        'S7',
      ),
    ],
    admin: {
      basePath: '/system/notices',
      routes: [
        {
          path: '/system/notices',
          title: 'System Notices',
          permissionCode: 'core:notice:read',
        },
      ],
    },
  },
  {
    code: 'core.dept',
    title: 'Departments',
    layer: 'core',
    priority: 'P2',
    status: 'planned',
    stage: 'S7',
    enabledByDefault: true,
    description: 'Department tree management without user binding yet.',
    apiTags: ['Core Departments'],
    permissions: definePermissions(
      'core',
      'dept',
      'departments',
      'S7',
      CRUD_PERMISSION_SEEDS,
    ),
    menus: [
      defineMenu(
        'system.depts',
        'Departments',
        '/system/depts',
        'core:dept:read',
        218,
        'S7',
      ),
    ],
    admin: {
      basePath: '/system/depts',
      routes: [
        {
          path: '/system/depts',
          title: 'Departments',
          permissionCode: 'core:dept:read',
        },
      ],
    },
  },
  {
    code: 'core.post',
    title: 'Posts',
    layer: 'core',
    priority: 'P2',
    status: 'planned',
    stage: 'S7',
    enabledByDefault: true,
    description: 'Post and position management without user binding yet.',
    apiTags: ['Core Posts'],
    permissions: definePermissions(
      'core',
      'post',
      'posts',
      'S7',
      CRUD_PERMISSION_SEEDS,
    ),
    menus: [
      defineMenu(
        'system.posts',
        'Posts',
        '/system/posts',
        'core:post:read',
        219,
        'S7',
      ),
    ],
    admin: {
      basePath: '/system/posts',
      routes: [
        {
          path: '/system/posts',
          title: 'Posts',
          permissionCode: 'core:post:read',
        },
      ],
    },
  },
  {
    code: 'core.file',
    title: 'File Center',
    layer: 'core',
    priority: 'P2',
    status: 'planned',
    stage: 'S7',
    enabledByDefault: true,
    description: 'Generic file asset center without industry image semantics.',
    apiTags: ['Core Files'],
    permissions: definePermissions(
      'core',
      'file',
      'files',
      'S7',
      CRUD_PERMISSION_SEEDS,
    ),
    menus: [
      defineMenu(
        'system.files',
        'File Center',
        '/system/files',
        'core:file:read',
        220,
        'S7',
      ),
    ],
    admin: {
      basePath: '/system/files',
      routes: [
        {
          path: '/system/files',
          title: 'File Center',
          permissionCode: 'core:file:read',
        },
      ],
    },
  },
  {
    code: 'core.audit-log',
    title: 'Operation Logs',
    layer: 'core',
    priority: 'P2',
    status: 'planned',
    stage: 'S7',
    enabledByDefault: true,
    description: 'Operation audit log with sensitive field redaction.',
    apiTags: ['Core Audit Logs'],
    permissions: definePermissions(
      'core',
      'audit-log',
      'operation logs',
      'S7',
      [
        { action: 'read', title: 'Read' },
        { action: 'export', title: 'Export' },
        { action: 'delete', title: 'Delete', dangerous: true },
      ],
    ),
    menus: [
      defineMenu(
        'security.operation-logs',
        'Operation Logs',
        '/security/operation-logs',
        'core:audit-log:read',
        300,
        'S7',
      ),
    ],
    admin: {
      basePath: '/security/operation-logs',
      routes: [
        {
          path: '/security/operation-logs',
          title: 'Operation Logs',
          permissionCode: 'core:audit-log:read',
        },
      ],
    },
  },
  {
    code: 'core.login-log',
    title: 'Login Logs',
    layer: 'core',
    priority: 'P2',
    status: 'planned',
    stage: 'S7',
    enabledByDefault: true,
    description: 'Login audit log created after the S6 auth baseline exists.',
    apiTags: ['Core Login Logs', 'Core IP Location'],
    permissions: definePermissions('core', 'login-log', 'login logs', 'S7', [
      { action: 'read', title: 'Read' },
      { action: 'export', title: 'Export' },
      { action: 'delete', title: 'Delete', dangerous: true },
      { action: 'manage', title: 'Manage', dangerous: true },
    ]),
    menus: [
      defineMenu(
        'security.login-logs',
        'Login Logs',
        '/security/login-logs',
        'core:login-log:read',
        310,
        'S7',
      ),
    ],
    admin: {
      basePath: '/security/login-logs',
      routes: [
        {
          path: '/security/login-logs',
          title: 'Login Logs',
          permissionCode: 'core:login-log:read',
        },
      ],
    },
  },
  {
    code: 'monitor.status',
    title: 'System Status',
    layer: 'monitor',
    priority: 'P2',
    status: 'planned',
    stage: 'S8',
    enabledByDefault: true,
    description: 'Read-only dependency and system diagnostics.',
    apiTags: ['Monitor Status'],
    permissions: definePermissions('monitor', 'status', 'system status', 'S8', [
      { action: 'read', title: 'Read' },
    ]),
    menus: [
      defineMenu(
        'monitor.status',
        'System Status',
        '/monitor/status',
        'monitor:status:read',
        400,
        'S8',
      ),
    ],
    admin: {
      basePath: '/monitor/status',
      routes: [
        {
          path: '/monitor/status',
          title: 'System Status',
          permissionCode: 'monitor:status:read',
        },
      ],
    },
  },
  {
    code: 'monitor.version',
    title: 'Version Info',
    layer: 'monitor',
    priority: 'P2',
    status: 'planned',
    stage: 'S8',
    enabledByDefault: true,
    description: 'Version, commit, and build metadata diagnostics.',
    apiTags: ['Monitor Version'],
    permissions: definePermissions('monitor', 'version', 'version info', 'S8', [
      { action: 'read', title: 'Read' },
    ]),
    menus: [
      defineMenu(
        'monitor.version',
        'Version',
        '/monitor/version',
        'monitor:version:read',
        410,
        'S8',
      ),
    ],
    admin: {
      basePath: '/monitor/version',
      routes: [
        {
          path: '/monitor/version',
          title: 'Version',
          permissionCode: 'monitor:version:read',
        },
      ],
    },
  },
  {
    code: 'monitor.queue',
    title: 'Queues',
    layer: 'monitor',
    priority: 'P2',
    status: 'planned',
    stage: 'S8',
    enabledByDefault: true,
    description:
      'BullMQ queue status diagnostics with guarded pause and resume controls.',
    apiTags: ['Monitor Queues'],
    permissions: definePermissions('monitor', 'queue', 'queues', 'S8', [
      { action: 'read', title: 'Read' },
      { action: 'manage', title: 'Manage', dangerous: true },
    ]),
    menus: [
      defineMenu(
        'monitor.queues',
        'Queues',
        '/monitor/queues',
        'monitor:queue:read',
        420,
        'S8',
      ),
    ],
    admin: {
      basePath: '/monitor/queues',
      routes: [
        {
          path: '/monitor/queues',
          title: 'Queues',
          permissionCode: 'monitor:queue:read',
        },
      ],
    },
  },
  {
    code: 'tool.openapi',
    title: 'OpenAPI',
    layer: 'tool',
    priority: 'P0',
    status: 'planned',
    stage: 'S8',
    enabledByDefault: true,
    description: 'OpenAPI contract export, SDK generation, and drift status.',
    apiTags: ['Tool OpenAPI'],
    permissions: definePermissions(
      'tool',
      'openapi',
      'OpenAPI contract',
      'S8',
      [
        { action: 'read', title: 'Read' },
        { action: 'export', title: 'Export' },
      ],
    ),
    menus: [
      defineMenu(
        'tools.openapi',
        'OpenAPI',
        '/tools/openapi',
        'tool:openapi:read',
        500,
        'S8',
      ),
    ],
    admin: {
      basePath: '/tools/openapi',
      routes: [
        {
          path: '/tools/openapi',
          title: 'OpenAPI',
          permissionCode: 'tool:openapi:read',
        },
      ],
    },
  },
  {
    code: 'tool.export',
    title: 'Export Tools',
    layer: 'tool',
    priority: 'P3',
    status: 'planned',
    stage: 'S8',
    enabledByDefault: true,
    description: 'Current-page export protocol and reusable Admin template.',
    apiTags: ['Tool Export'],
    permissions: definePermissions('tool', 'export', 'export tools', 'S8', [
      { action: 'read', title: 'Read' },
      { action: 'export', title: 'Export' },
    ]),
    menus: [
      defineMenu(
        'tools.export',
        'Export Tools',
        '/tools/export',
        'tool:export:read',
        510,
        'S8',
      ),
    ],
    admin: {
      basePath: '/tools/export',
      routes: [
        {
          path: '/tools/export',
          title: 'Export Tools',
          permissionCode: 'tool:export:read',
        },
      ],
    },
  },
  {
    code: 'system.area',
    title: 'Area Management',
    layer: 'system',
    priority: 'P1',
    status: 'active',
    stage: 'S12',
    enabledByDefault: true,
    description:
      'System area master data with versioned dataset governance, tree query, formatter, and IP range lookup.',
    apiTags: ['System Area'],
    permissions: definePermissions('system', 'area', 'area management', 'S12', [
      { action: 'read', title: 'Read' },
      { action: 'import', title: 'Import' },
      { action: 'manage', title: 'Manage', dangerous: true },
    ]),
    menus: [
      defineMenu(
        'system.area',
        'Area Management',
        '/system/area',
        'system:area:read',
        225,
        'S12',
      ),
    ],
    admin: {
      basePath: '/system/area',
      routes: [
        {
          path: '/system/area',
          title: 'Area Management',
          permissionCode: 'system:area:read',
        },
      ],
    },
  },
  {
    code: 'tool.openforge',
    title: 'OpenForge',
    layer: 'tool',
    priority: 'P0',
    status: 'active',
    stage: 'S9',
    enabledByDefault: true,
    description:
      'Safe generator workbench for plan, diff, check, manifest and dry-run apply/rollback flows.',
    apiTags: ['Tool OpenForge'],
    permissions: definePermissions('tool', 'openforge', 'OpenForge', 'S9', [
      { action: 'read', title: 'Read' },
      { action: 'manage', title: 'Manage' },
    ]),
    menus: [
      defineMenu(
        'tools.openforge',
        'OpenForge',
        '/tools/openforge',
        'tool:openforge:read',
        520,
        'S9',
      ),
    ],
    admin: {
      basePath: '/tools/openforge',
      routes: [
        {
          path: '/tools/openforge',
          title: 'OpenForge',
          permissionCode: 'tool:openforge:read',
        },
      ],
    },
  },
  {
    code: 'collaboration.message',
    title: 'Messages',
    layer: 'collaboration',
    priority: 'P2',
    status: 'planned',
    stage: 'S10',
    enabledByDefault: true,
    description:
      'Internal inbox messages with read, archive, and delete policy.',
    apiTags: ['Collaboration Messages'],
    permissions: definePermissions(
      'collaboration',
      'message',
      'messages',
      'S10',
      [
        { action: 'read', title: 'Read' },
        { action: 'create', title: 'Create' },
        { action: 'update', title: 'Update' },
        { action: 'delete', title: 'Delete', dangerous: true },
      ],
    ),
    menus: [
      defineMenu(
        'collaboration.messages',
        'Messages',
        '/collaboration/messages',
        'collaboration:message:read',
        600,
        'S10',
      ),
    ],
    admin: {
      basePath: '/collaboration/messages',
      routes: [
        {
          path: '/collaboration/messages',
          title: 'Messages',
          permissionCode: 'collaboration:message:read',
        },
      ],
    },
  },
  {
    code: 'collaboration.notice',
    title: 'Notices',
    layer: 'collaboration',
    priority: 'P2',
    status: 'planned',
    stage: 'S10',
    enabledByDefault: true,
    description:
      'Notice draft, publish, archive, and target-audience workflow.',
    apiTags: ['Collaboration Notices'],
    permissions: definePermissions(
      'collaboration',
      'notice',
      'notices',
      'S10',
      [
        { action: 'read', title: 'Read' },
        { action: 'create', title: 'Create' },
        { action: 'update', title: 'Update' },
      ],
    ),
    menus: [
      defineMenu(
        'collaboration.notices',
        'Notices',
        '/collaboration/notices',
        'collaboration:notice:read',
        610,
        'S10',
      ),
    ],
    admin: {
      basePath: '/collaboration/notices',
      routes: [
        {
          path: '/collaboration/notices',
          title: 'Notices',
          permissionCode: 'collaboration:notice:read',
        },
      ],
    },
  },
  {
    code: 'collaboration.todo',
    title: 'Todos',
    layer: 'collaboration',
    priority: 'P2',
    status: 'planned',
    stage: 'S10',
    enabledByDefault: true,
    description:
      'Assignable todos linked to source type and business identifiers.',
    apiTags: ['Collaboration Todos'],
    permissions: definePermissions('collaboration', 'todo', 'todos', 'S10', [
      { action: 'read', title: 'Read' },
      { action: 'create', title: 'Create' },
      { action: 'update', title: 'Update' },
    ]),
    menus: [
      defineMenu(
        'collaboration.todos',
        'Todos',
        '/collaboration/todos',
        'collaboration:todo:read',
        620,
        'S10',
      ),
    ],
    admin: {
      basePath: '/collaboration/todos',
      routes: [
        {
          path: '/collaboration/todos',
          title: 'Todos',
          permissionCode: 'collaboration:todo:read',
        },
      ],
    },
  },
  {
    code: 'collaboration.ticket',
    title: 'Tickets',
    layer: 'collaboration',
    priority: 'P2',
    status: 'active',
    stage: 'S10',
    enabledByDefault: true,
    description:
      'Tenant-owned work orders with category, assignment, comments, attachments, and status transitions.',
    apiTags: ['Collaboration Tickets'],
    permissions: definePermissions(
      'collaboration',
      'ticket',
      'tickets',
      'S10',
      [
        { action: 'read', title: 'Read' },
        { action: 'create', title: 'Create' },
        { action: 'update', title: 'Update' },
        { action: 'assign', title: 'Assign' },
        { action: 'comment', title: 'Comment' },
        { action: 'close', title: 'Close', dangerous: true },
        { action: 'delete', title: 'Delete', dangerous: true },
      ],
    ),
    menus: [
      defineMenu(
        'collaboration.tickets',
        'Tickets',
        '/collaboration/tickets',
        'collaboration:ticket:read',
        625,
        'S10',
      ),
    ],
    admin: {
      basePath: '/collaboration/tickets',
      routes: [
        {
          path: '/collaboration/tickets',
          title: 'Tickets',
          permissionCode: 'collaboration:ticket:read',
        },
      ],
    },
  },
  {
    code: 'collaboration.approval-lite',
    title: 'Approval Lite',
    layer: 'collaboration',
    priority: 'P2',
    status: 'planned',
    stage: 'S10',
    enabledByDefault: true,
    description: 'Single-step approve/reject requests without BPMN workflow.',
    apiTags: ['Collaboration Approval Lite'],
    permissions: definePermissions(
      'collaboration',
      'approval-lite',
      'approval lite',
      'S10',
      [
        { action: 'read', title: 'Read' },
        { action: 'create', title: 'Create' },
        { action: 'update', title: 'Update' },
      ],
    ),
    menus: [
      defineMenu(
        'collaboration.approvals',
        'Approval Lite',
        '/collaboration/approvals',
        'collaboration:approval-lite:read',
        630,
        'S10',
      ),
    ],
    admin: {
      basePath: '/collaboration/approvals',
      routes: [
        {
          path: '/collaboration/approvals',
          title: 'Approval Lite',
          permissionCode: 'collaboration:approval-lite:read',
        },
      ],
    },
  },
  {
    code: 'business.core',
    title: 'Business Core',
    layer: 'business',
    priority: 'P3',
    status: 'active',
    stage: 'S12',
    enabledByDefault: true,
    description:
      'Tenant-owned business foundation for accounts, contacts, follow-ups, reminders, owner transfer, attachments, tags, and audit.',
    apiTags: ['Business Core'],
    permissions: definePermissions('business', 'core', 'business core', 'S12', [
      { action: 'read', title: 'Read' },
      { action: 'create', title: 'Create' },
      { action: 'update', title: 'Update' },
      { action: 'assign', title: 'Transfer owner for' },
      { action: 'comment', title: 'Follow up' },
      { action: 'export', title: 'Export' },
      { action: 'delete', title: 'Archive', dangerous: true },
    ]),
    menus: [
      defineMenu(
        'business.accounts',
        'Accounts',
        '/business/accounts',
        'business:core:read',
        920,
        'S12',
      ),
      defineMenu(
        'business.contacts',
        'Contacts',
        '/business/contacts',
        'business:core:read',
        930,
        'S12',
      ),
      defineMenu(
        'business.tasks',
        'Business Tasks',
        '/business/tasks',
        'business:core:read',
        950,
        'S12',
      ),
      defineMenu(
        'business.tags',
        'Tags',
        '/business/tags',
        'business:core:read',
        960,
        'S12',
      ),
      defineMenu(
        'business.activity',
        'Activity',
        '/business/activity',
        'business:core:read',
        970,
        'S12',
      ),
    ],
    admin: {
      basePath: '/business',
      routes: [
        {
          path: '/business/accounts',
          title: 'Accounts',
          permissionCode: 'business:core:read',
        },
        {
          path: '/business/contacts',
          title: 'Contacts',
          permissionCode: 'business:core:read',
        },
        {
          path: '/business/tasks',
          title: 'Business Tasks',
          permissionCode: 'business:core:read',
        },
        {
          path: '/business/tags',
          title: 'Tags',
          permissionCode: 'business:core:read',
        },
        {
          path: '/business/activity',
          title: 'Activity',
          permissionCode: 'business:core:read',
        },
      ],
    },
  },
  {
    code: 'business.sales',
    title: 'Business Sales',
    layer: 'business',
    priority: 'P3',
    status: 'active',
    stage: 'S12',
    enabledByDefault: true,
    description:
      'Sales suite for leads, opportunities, funnel movement, lead conversion, exports, and sales dashboard reporting.',
    apiTags: ['Business Sales'],
    permissions: definePermissions(
      'business',
      'sales',
      'business sales',
      'S12',
      [
        { action: 'read', title: 'Read' },
        { action: 'create', title: 'Create' },
        { action: 'update', title: 'Update' },
        { action: 'assign', title: 'Transfer owner for' },
        { action: 'export', title: 'Export' },
        { action: 'delete', title: 'Archive', dangerous: true },
      ],
    ),
    menus: [
      defineMenu(
        'business.overview',
        'Business Overview',
        '/business/overview',
        'business:sales:read',
        900,
        'S12',
      ),
      defineMenu(
        'business.leads',
        'Leads',
        '/business/leads',
        'business:sales:read',
        910,
        'S12',
      ),
      defineMenu(
        'business.opportunities',
        'Opportunities',
        '/business/opportunities',
        'business:sales:read',
        940,
        'S12',
      ),
    ],
    admin: {
      basePath: '/business',
      routes: [
        {
          path: '/business/overview',
          title: 'Business Overview',
          permissionCode: 'business:sales:read',
        },
        {
          path: '/business/leads',
          title: 'Leads',
          permissionCode: 'business:sales:read',
        },
        {
          path: '/business/opportunities',
          title: 'Opportunities',
          permissionCode: 'business:sales:read',
        },
      ],
    },
  },
  {
    code: 'business.commerce',
    title: 'Business Commerce',
    layer: 'business',
    priority: 'P3',
    status: 'active',
    stage: 'S12',
    enabledByDefault: true,
    description:
      'Commercial loop for product catalog, quotes, contracts, receivables, payment tracking, exports, and commerce dashboard reporting.',
    apiTags: ['Business Commerce'],
    permissions: definePermissions(
      'business',
      'commerce',
      'business commerce',
      'S12',
      [
        { action: 'read', title: 'Read' },
        { action: 'create', title: 'Create' },
        { action: 'update', title: 'Update' },
        { action: 'export', title: 'Export' },
        { action: 'delete', title: 'Archive or cancel', dangerous: true },
      ],
    ),
    menus: [
      defineMenu(
        'business.products',
        'Products',
        '/business/products',
        'business:commerce:read',
        980,
        'S12',
      ),
      defineMenu(
        'business.quotes',
        'Quotes',
        '/business/quotes',
        'business:commerce:read',
        990,
        'S12',
      ),
      defineMenu(
        'business.contracts',
        'Contracts',
        '/business/contracts',
        'business:commerce:read',
        1000,
        'S12',
      ),
      defineMenu(
        'business.receivables',
        'Receivables',
        '/business/receivables',
        'business:commerce:read',
        1010,
        'S12',
      ),
    ],
    admin: {
      basePath: '/business',
      routes: [
        {
          path: '/business/products',
          title: 'Products',
          permissionCode: 'business:commerce:read',
        },
        {
          path: '/business/quotes',
          title: 'Quotes',
          permissionCode: 'business:commerce:read',
        },
        {
          path: '/business/contracts',
          title: 'Contracts',
          permissionCode: 'business:commerce:read',
        },
        {
          path: '/business/receivables',
          title: 'Receivables',
          permissionCode: 'business:commerce:read',
        },
      ],
    },
  },
  {
    code: 'business.lifecycle',
    title: 'Business Lifecycle',
    layer: 'business',
    priority: 'P3',
    status: 'active',
    stage: 'S12',
    enabledByDefault: true,
    description:
      'Assignment pool and customer lifecycle operations for claim, assignment, recycling, duplicate detection, stage transitions, and lifecycle timeline review.',
    apiTags: ['Business Lifecycle'],
    permissions: definePermissions(
      'business',
      'lifecycle',
      'business lifecycle',
      'S12',
      [
        { action: 'read', title: 'Read' },
        { action: 'create', title: 'Enter assignment pool' },
        { action: 'update', title: 'Update lifecycle' },
        { action: 'assign', title: 'Assign owner for' },
        { action: 'export', title: 'Export' },
      ],
    ),
    menus: [
      defineMenu(
        'business.pool',
        'Assignment Pool',
        '/business/pool',
        'business:lifecycle:read',
        905,
        'S12',
      ),
      defineMenu(
        'business.lifecycle',
        'Customer Lifecycle',
        '/business/lifecycle',
        'business:lifecycle:read',
        935,
        'S12',
      ),
    ],
    admin: {
      basePath: '/business',
      routes: [
        {
          path: '/business/pool',
          title: 'Assignment Pool',
          permissionCode: 'business:lifecycle:read',
        },
        {
          path: '/business/lifecycle',
          title: 'Customer Lifecycle',
          permissionCode: 'business:lifecycle:read',
        },
      ],
    },
  },
  {
    code: 'monitor.job',
    title: 'Jobs',
    layer: 'monitor',
    priority: 'P2',
    status: 'planned',
    stage: 'S11',
    enabledByDefault: true,
    description:
      'Job definitions, BullMQ adapter policy, run logs, and manual trigger.',
    apiTags: ['Monitor Jobs'],
    permissions: definePermissions('monitor', 'job', 'jobs', 'S11', [
      { action: 'read', title: 'Read' },
      { action: 'create', title: 'Create' },
      { action: 'update', title: 'Update' },
      { action: 'manage', title: 'Manage' },
    ]),
    menus: [
      defineMenu(
        'monitor.jobs',
        'Jobs',
        '/monitor/jobs',
        'monitor:job:read',
        430,
        'S11',
      ),
    ],
    admin: {
      basePath: '/monitor/jobs',
      routes: [
        {
          path: '/monitor/jobs',
          title: 'Jobs',
          permissionCode: 'monitor:job:read',
        },
      ],
    },
  },
  {
    code: 'monitor.cache',
    title: 'Cache',
    layer: 'monitor',
    priority: 'P2',
    status: 'active',
    stage: 'S11',
    enabledByDefault: true,
    description:
      'Redis cache namespace/key listing, safe value preview and confirmed delete/clear operations.',
    apiTags: ['Monitor Cache'],
    permissions: definePermissions('monitor', 'cache', 'cache', 'S11', [
      { action: 'read', title: 'Read' },
      { action: 'manage', title: 'Manage', dangerous: true },
    ]),
    menus: [
      defineMenu(
        'monitor.cache',
        'Cache',
        '/monitor/cache',
        'monitor:cache:read',
        440,
        'S11',
      ),
    ],
    admin: {
      basePath: '/monitor/cache',
      routes: [
        {
          path: '/monitor/cache',
          title: 'Cache',
          permissionCode: 'monitor:cache:read',
        },
      ],
    },
  },
  {
    code: 'monitor.online-user',
    title: 'Online Users',
    layer: 'monitor',
    priority: 'P2',
    status: 'planned',
    stage: 'S11',
    enabledByDefault: true,
    description: 'Active session visibility with permission-gated kick-out.',
    apiTags: ['Monitor Online Users'],
    permissions: definePermissions(
      'monitor',
      'online-user',
      'online users',
      'S11',
      [
        { action: 'read', title: 'Read' },
        { action: 'manage', title: 'Manage', dangerous: true },
      ],
    ),
    menus: [
      defineMenu(
        'monitor.online-users',
        'Online Users',
        '/monitor/online-users',
        'monitor:online-user:read',
        450,
        'S11',
      ),
    ],
    admin: {
      basePath: '/monitor/online-users',
      routes: [
        {
          path: '/monitor/online-users',
          title: 'Online Users',
          permissionCode: 'monitor:online-user:read',
        },
      ],
    },
  },
  {
    code: 'optional.report',
    title: 'Reports',
    layer: 'optional',
    priority: 'P3',
    status: 'optional',
    stage: 'S11',
    enabledByDefault: false,
    description:
      'Minimal report definition and query schema, not a full designer.',
    apiTags: ['Optional Reports'],
    permissions: definePermissions('optional', 'report', 'reports', 'S11', [
      { action: 'read', title: 'Read' },
      { action: 'create', title: 'Create' },
    ]),
    menus: [
      defineMenu(
        'optional.reports',
        'Reports',
        '/optional/reports',
        'optional:report:read',
        700,
        'S11',
      ),
    ],
    admin: {
      basePath: '/optional/reports',
      routes: [
        {
          path: '/optional/reports',
          title: 'Reports',
          permissionCode: 'optional:report:read',
        },
      ],
    },
  },
  {
    code: 'optional.export-job',
    title: 'Export Job Design',
    layer: 'optional',
    priority: 'P3',
    status: 'optional',
    stage: 'S11',
    enabledByDefault: false,
    description:
      'Async export job design binding files, jobs, permissions, expiry, and audit.',
    apiTags: ['Optional Export Jobs'],
    permissions: definePermissions(
      'optional',
      'export-job',
      'export jobs',
      'S11',
      [{ action: 'read', title: 'Read' }],
    ),
    menus: [
      defineMenu(
        'optional.export-jobs',
        'Export Jobs',
        '/optional/export-jobs',
        'optional:export-job:read',
        710,
        'S11',
      ),
    ],
    admin: {
      basePath: '/optional/export-jobs',
      routes: [
        {
          path: '/optional/export-jobs',
          title: 'Export Jobs',
          permissionCode: 'optional:export-job:read',
        },
      ],
    },
  },
  {
    code: 'integration.provider',
    title: 'Integration Providers',
    layer: 'integration',
    priority: 'P2',
    status: 'planned',
    stage: 'S12',
    enabledByDefault: true,
    description:
      'Provider registry, secret references, redaction, health checks, enable/disable.',
    apiTags: ['Integration Providers'],
    permissions: definePermissions(
      'integration',
      'provider',
      'providers',
      'S12',
      [
        { action: 'read', title: 'Read' },
        { action: 'create', title: 'Create' },
        { action: 'update', title: 'Update' },
        { action: 'manage', title: 'Manage' },
      ],
    ),
    menus: [
      defineMenu(
        'integrations.providers',
        'Providers',
        '/integrations/providers',
        'integration:provider:read',
        800,
        'S12',
      ),
    ],
    admin: {
      basePath: '/integrations/providers',
      routes: [
        {
          path: '/integrations/providers',
          title: 'Providers',
          permissionCode: 'integration:provider:read',
        },
      ],
    },
  },
  {
    code: 'integration.mail',
    title: 'Mail',
    layer: 'integration',
    priority: 'P3',
    status: 'planned',
    stage: 'S12',
    enabledByDefault: true,
    description:
      'Mail provider abstraction, templates, outbox, preview, send log, retry policy.',
    apiTags: ['Integration Mail'],
    permissions: definePermissions('integration', 'mail', 'mail', 'S12', [
      { action: 'read', title: 'Read' },
      { action: 'create', title: 'Create' },
      { action: 'manage', title: 'Manage' },
    ]),
    menus: [
      defineMenu(
        'integrations.mail',
        'Mail',
        '/integrations/mail',
        'integration:mail:read',
        810,
        'S12',
      ),
    ],
    admin: {
      basePath: '/integrations/mail',
      routes: [
        {
          path: '/integrations/mail',
          title: 'Mail',
          permissionCode: 'integration:mail:read',
        },
      ],
    },
  },
  {
    code: 'integration.sms',
    title: 'SMS',
    layer: 'integration',
    priority: 'P3',
    status: 'planned',
    stage: 'S12',
    enabledByDefault: true,
    description:
      'SMS provider abstraction, templates, outbox, rate-limit and verification-code safety.',
    apiTags: ['Integration SMS'],
    permissions: definePermissions('integration', 'sms', 'SMS', 'S12', [
      { action: 'read', title: 'Read' },
      { action: 'create', title: 'Create' },
      { action: 'manage', title: 'Manage' },
    ]),
    menus: [
      defineMenu(
        'integrations.sms',
        'SMS',
        '/integrations/sms',
        'integration:sms:read',
        820,
        'S12',
      ),
    ],
    admin: {
      basePath: '/integrations/sms',
      routes: [
        {
          path: '/integrations/sms',
          title: 'SMS',
          permissionCode: 'integration:sms:read',
        },
      ],
    },
  },
  {
    code: 'integration.oauth',
    title: 'OAuth',
    layer: 'integration',
    priority: 'P3',
    status: 'planned',
    stage: 'S12',
    enabledByDefault: true,
    description:
      'OAuth provider config, callback contract, token inventory, revoke lifecycle, state security, account binding, audit.',
    apiTags: ['Integration OAuth'],
    permissions: definePermissions('integration', 'oauth', 'OAuth', 'S12', [
      { action: 'read', title: 'Read' },
      { action: 'create', title: 'Create' },
      { action: 'manage', title: 'Manage' },
    ]),
    menus: [
      defineMenu(
        'integrations.oauth',
        'OAuth',
        '/integrations/oauth',
        'integration:oauth:read',
        830,
        'S12',
      ),
    ],
    admin: {
      basePath: '/integrations/oauth',
      routes: [
        {
          path: '/integrations/oauth',
          title: 'OAuth',
          permissionCode: 'integration:oauth:read',
        },
      ],
    },
  },
  {
    code: 'integration.wechat',
    title: 'WeChat Design',
    layer: 'integration',
    priority: 'P4',
    status: 'planned',
    stage: 'S12',
    enabledByDefault: false,
    description:
      'WeChat integration design boundary without complete WeChat business implementation.',
    apiTags: ['Integration WeChat'],
    permissions: definePermissions('integration', 'wechat', 'WeChat', 'S12', [
      { action: 'read', title: 'Read' },
    ]),
    menus: [
      defineMenu(
        'integrations.wechat',
        'WeChat',
        '/integrations/wechat',
        'integration:wechat:read',
        840,
        'S12',
      ),
    ],
    admin: {
      basePath: '/integrations/wechat',
      routes: [
        {
          path: '/integrations/wechat',
          title: 'WeChat',
          permissionCode: 'integration:wechat:read',
        },
      ],
    },
  },
  {
    code: 'integration.websocket',
    title: 'WebSocket Runtime',
    layer: 'integration',
    priority: 'P4',
    status: 'active',
    stage: 'S12',
    enabledByDefault: false,
    description:
      'Authenticated runtime connection diagnostics, subscription routing, diagnostic event stream, and security boundary.',
    apiTags: ['Integration WebSocket'],
    permissions: definePermissions(
      'integration',
      'websocket',
      'WebSocket',
      'S12',
      [{ action: 'read', title: 'Read' }],
    ),
    menus: [
      defineMenu(
        'integrations.websocket',
        'WebSocket',
        '/integrations/websocket',
        'integration:websocket:read',
        850,
        'S12',
      ),
    ],
    admin: {
      basePath: '/integrations/websocket',
      routes: [
        {
          path: '/integrations/websocket',
          title: 'WebSocket',
          permissionCode: 'integration:websocket:read',
        },
      ],
    },
  },
  {
    code: 'integration.billing-design',
    title: 'Payment Design',
    layer: 'integration',
    priority: 'P4',
    status: 'planned',
    stage: 'S12',
    enabledByDefault: false,
    description: 'Payment provider design with mock/sandbox boundary only.',
    apiTags: ['Integration Payment'],
    permissions: definePermissions(
      'integration',
      'billing-design',
      'payment design',
      'S12',
      [{ action: 'read', title: 'Read' }],
    ),
    menus: [
      defineMenu(
        'integrations.billing-design',
        'Payment',
        '/integrations/billing-design',
        'integration:billing-design:read',
        860,
        'S12',
      ),
    ],
    admin: {
      basePath: '/integrations/billing-design',
      routes: [
        {
          path: '/integrations/billing-design',
          title: 'Payment',
          permissionCode: 'integration:billing-design:read',
        },
      ],
    },
  },
] as const satisfies readonly ModuleDefinition[];

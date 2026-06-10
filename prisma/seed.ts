import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  collectMenus,
  collectPermissionCodes,
  collectPermissionDefinitions,
} from '@opencore/module-registry';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type SeedRoleDefinition = {
  code: string;
  name: string;
  system: boolean;
  permissionCodes: readonly string[];
};

const LOCAL_ENV_FILE = '.env.opencore.local';
const BOOTSTRAP_ADMIN_USERNAME = 'admin';
const BOOTSTRAP_ADMIN_ROLE_CODE = 'admin';

loadLocalEnvFile();

const databaseUrl = readDatabaseUrl();
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main(): Promise<void> {
  const bootstrapPassword = readBootstrapAdminPassword();

  const permissionCount = await seedPermissions();
  const menuCount = await seedMenus();
  const roleCount = await seedRoles();
  await seedBootstrapAdmin(bootstrapPassword);

  console.log(
    JSON.stringify({
      seeded: {
        permissions: permissionCount,
        menus: menuCount,
        roles: roleCount,
        bootstrapAdminUsername: BOOTSTRAP_ADMIN_USERNAME,
        bootstrapAdminRoleCode: BOOTSTRAP_ADMIN_ROLE_CODE,
      },
    }),
  );
}

async function seedPermissions(): Promise<number> {
  const permissions = collectPermissionDefinitions();

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { title: permission.title },
      create: {
        code: permission.code,
        title: permission.title,
      },
    });
  }

  return permissions.length;
}

async function seedMenus(): Promise<number> {
  const menus = collectMenus();

  for (const menu of menus) {
    const permission = menu.permissionCode
      ? await prisma.permission.findUnique({
          where: { code: menu.permissionCode },
        })
      : null;

    await prisma.menu.upsert({
      where: { key: menu.key },
      update: {
        title: menu.title,
        path: menu.path,
        order: menu.order,
        hidden: false,
        permissionId: permission?.id ?? null,
      },
      create: {
        key: menu.key,
        title: menu.title,
        path: menu.path,
        order: menu.order,
        hidden: false,
        permissionId: permission?.id ?? null,
      },
    });
  }

  return menus.length;
}

async function seedRoles(): Promise<number> {
  const roles: readonly SeedRoleDefinition[] = [
    {
      code: BOOTSTRAP_ADMIN_ROLE_CODE,
      name: 'Administrator',
      system: true,
      permissionCodes: collectPermissionCodes(),
    },
    {
      code: 'viewer',
      name: 'Viewer',
      system: true,
      permissionCodes: [
        'core:dashboard:read',
        'tool:openapi:read',
        'core:user:read',
        'core:role:read',
        'core:permission:read',
        'core:menu:read',
      ],
    },
  ];

  for (const roleDefinition of roles) {
    const role = await prisma.role.upsert({
      where: { code: roleDefinition.code },
      update: {
        name: roleDefinition.name,
        system: roleDefinition.system,
      },
      create: {
        code: roleDefinition.code,
        name: roleDefinition.name,
        system: roleDefinition.system,
      },
    });

    const permissions = await prisma.permission.findMany({
      where: { code: { in: [...roleDefinition.permissionCodes] } },
      select: { id: true },
    });
    const desiredPermissionIds = permissions.map((permission) => permission.id);

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: { notIn: desiredPermissionIds },
      },
    });

    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  return roles.length;
}

async function seedBootstrapAdmin(bootstrapPassword: string): Promise<void> {
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: BOOTSTRAP_ADMIN_ROLE_CODE },
  });
  const adminUser = await prisma.user.upsert({
    where: { username: BOOTSTRAP_ADMIN_USERNAME },
    update: {
      displayName: 'OpenCore Admin',
      passwordHash: hashPassword(bootstrapPassword),
      enabled: true,
    },
    create: {
      username: BOOTSTRAP_ADMIN_USERNAME,
      displayName: 'OpenCore Admin',
      passwordHash: hashPassword(bootstrapPassword),
      enabled: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
}

function loadLocalEnvFile(): void {
  const envPath = resolve(process.cwd(), LOCAL_ENV_FILE);

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const normalized = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    const separatorIndex = normalized.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    const value = stripEnvQuotes(normalized.slice(separatorIndex + 1).trim());

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set before running prisma:seed');
  }

  const normalized = databaseUrl.toLowerCase();

  if (normalized.includes('nestweb')) {
    throw new Error('DATABASE_URL must not target a NestWeb database');
  }

  if (!normalized.includes('opencore')) {
    throw new Error('DATABASE_URL must target an OpenCore database boundary');
  }

  return databaseUrl;
}

function readBootstrapAdminPassword(): string {
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error(
      'BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters for prisma:seed',
    );
  }

  if (isPlaceholder(password)) {
    throw new Error(
      'BOOTSTRAP_ADMIN_PASSWORD must be a local value, not a placeholder',
    );
  }

  return password;
}

function isPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('<') ||
    normalized.includes('>') ||
    normalized.includes('change-me') ||
    normalized.includes('local-bootstrap')
  );
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

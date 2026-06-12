import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import type { CreateMenuDto, UpdateMenuDto } from './system-menu.dto';
import type { SystemMenuRecord } from './system-menu.records';
import {
  compareSystemMenuRecords,
  normalizeCreateSystemMenuInput,
  normalizeUpdateSystemMenuInput,
  resolveSystemMenuStage,
  SystemMenuRepository,
} from './system-menu.repository';

type PrismaPermission = {
  id: string;
};

type PrismaMenuWithPermission = {
  key: string;
  parentKey: string | null;
  title: string;
  type: string;
  path: string;
  icon: string | null;
  component: string | null;
  order: number;
  status: string;
  cache: boolean;
  hidden: boolean;
  permission: { code: string } | null;
};

@Injectable()
export class PrismaSystemMenuRepository extends SystemMenuRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listMenus(): Promise<SystemMenuRecord[]> {
    const menus = await this.prisma.menu.findMany({
      include: {
        permission: true,
      },
      orderBy: [{ order: 'asc' }, { key: 'asc' }],
    });

    return menus.map(toSystemMenuRecord).sort(compareSystemMenuRecords);
  }

  async getMenu(key: string): Promise<SystemMenuRecord> {
    return toSystemMenuRecord(await this.findMenuEntityByKey(key));
  }

  async createMenu(body: CreateMenuDto): Promise<SystemMenuRecord> {
    const input = normalizeCreateSystemMenuInput(body);

    if (await this.prisma.menu.findUnique({ where: { key: input.key } })) {
      throw new ConflictException(`Menu already exists: ${input.key}`);
    }

    const permission = input.permissionCode
      ? await this.findPermissionEntityByCode(input.permissionCode)
      : undefined;
    await this.assertParentKey(input.parentKey, input.key);
    const menu = await this.prisma.menu.create({
      data: {
        key: input.key,
        parentKey: input.parentKey,
        title: input.title,
        type: input.type,
        path: input.path,
        icon: input.icon,
        component: input.component,
        order: input.order,
        status: input.status,
        cache: input.cache,
        hidden: input.hidden,
        permissionId: permission?.id,
      },
      include: {
        permission: true,
      },
    });

    return toSystemMenuRecord(menu);
  }

  async updateMenu(
    key: string,
    body: UpdateMenuDto,
  ): Promise<SystemMenuRecord> {
    const existing = toSystemMenuRecord(await this.findMenuEntityByKey(key));
    const input = normalizeUpdateSystemMenuInput(existing, body);
    await this.assertParentKey(input.parentKey, key);
    const permissionId = await this.resolvePermissionId(input.permissionCode);
    const menu = await this.prisma.menu.update({
      where: { key },
      data: {
        parentKey: input.parentKey,
        title: input.title,
        type: input.type,
        path: input.path,
        icon: input.icon,
        component: input.component,
        order: input.order,
        status: input.status,
        cache: input.cache,
        hidden: input.hidden,
        permissionId,
      },
      include: {
        permission: true,
      },
    });

    return toSystemMenuRecord(menu);
  }

  async deleteMenu(key: string): Promise<{ deleted: true }> {
    await this.findMenuEntityByKey(key);
    const childCount = await this.prisma.menu.count({
      where: { parentKey: key },
    });

    if (childCount > 0) {
      throw new BadRequestException(`Menu has child menus: ${key}`);
    }

    await this.prisma.menu.delete({ where: { key } });
    return { deleted: true };
  }

  private async resolvePermissionId(
    permissionCode: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (permissionCode === undefined) {
      return undefined;
    }

    if (permissionCode === null) {
      return null;
    }

    return (await this.findPermissionEntityByCode(permissionCode)).id;
  }

  private async findPermissionEntityByCode(
    code: string,
  ): Promise<PrismaPermission> {
    const permission = await this.prisma.permission.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!permission) {
      throw new NotFoundException(`Permission not found: ${code}`);
    }

    return permission;
  }

  private async findMenuEntityByKey(
    key: string,
  ): Promise<PrismaMenuWithPermission> {
    const menu = await this.prisma.menu.findUnique({
      where: { key },
      include: { permission: true },
    });

    if (!menu) {
      throw new NotFoundException(`Menu not found: ${key}`);
    }

    return menu;
  }

  private async assertParentKey(
    parentKey: string | null | undefined,
    currentKey: string,
  ): Promise<void> {
    if (!parentKey) {
      return;
    }

    const menus = await this.prisma.menu.findMany({
      select: {
        key: true,
        parentKey: true,
      },
    });
    const parentByKey = new Map(
      menus.map((menu) => [menu.key, menu.parentKey ?? undefined]),
    );

    if (!parentByKey.has(parentKey)) {
      throw new NotFoundException(`Parent menu not found: ${parentKey}`);
    }

    let cursor: string | undefined = parentKey;
    while (cursor) {
      if (cursor === currentKey) {
        throw new BadRequestException(
          `Menu parent would create a cycle: ${currentKey}`,
        );
      }
      cursor = parentByKey.get(cursor);
    }
  }
}

function toSystemMenuRecord(menu: PrismaMenuWithPermission): SystemMenuRecord {
  return {
    key: menu.key,
    parentKey: menu.parentKey ?? undefined,
    title: menu.title,
    type: menu.type === 'directory' ? 'directory' : 'menu',
    path: menu.path,
    icon: menu.icon ?? undefined,
    component: menu.component ?? undefined,
    permissionCode: menu.permission?.code,
    stage: resolveSystemMenuStage(menu.key),
    order: menu.order,
    status: menu.status === 'disabled' ? 'disabled' : 'enabled',
    cache: menu.cache,
    hidden: menu.hidden,
  };
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import type { CreateMenuDto, UpdateMenuDto } from './system-menu.dto';
import type { SystemMenuRecord } from './system-menu.records';
import {
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
  title: string;
  path: string;
  order: number;
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

    return menus.map(toSystemMenuRecord);
  }

  async createMenu(body: CreateMenuDto): Promise<SystemMenuRecord> {
    const input = normalizeCreateSystemMenuInput(body);

    if (await this.prisma.menu.findUnique({ where: { key: input.key } })) {
      throw new ConflictException(`Menu already exists: ${input.key}`);
    }

    const permission = input.permissionCode
      ? await this.findPermissionEntityByCode(input.permissionCode)
      : undefined;
    const menu = await this.prisma.menu.create({
      data: {
        key: input.key,
        title: input.title,
        path: input.path,
        order: input.order,
        hidden: false,
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
    const permissionId = await this.resolvePermissionId(input.permissionCode);
    const menu = await this.prisma.menu.update({
      where: { key },
      data: {
        title: input.title,
        path: input.path,
        order: input.order,
        ...(input.permissionCode === undefined ? {} : { permissionId }),
      },
      include: {
        permission: true,
      },
    });

    return toSystemMenuRecord(menu);
  }

  async deleteMenu(key: string): Promise<{ deleted: true }> {
    await this.findMenuEntityByKey(key);
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
}

function toSystemMenuRecord(menu: PrismaMenuWithPermission): SystemMenuRecord {
  return {
    key: menu.key,
    title: menu.title,
    path: menu.path,
    permissionCode: menu.permission?.code,
    stage: resolveSystemMenuStage(menu.key),
    order: menu.order,
  };
}

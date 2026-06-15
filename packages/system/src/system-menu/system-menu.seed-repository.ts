import { Injectable } from '@nestjs/common';
import {
  seedSystemMenuPermissionCodes,
  seedSystemMenus,
  type SystemMenuRecord,
} from './system-menu.records';
import {
  compareSystemMenuRecords,
  normalizeCreateSystemMenuInput,
  normalizeUpdateSystemMenuInput,
  systemMenuBadRequest,
  systemMenuConflict,
  systemMenuNotFound,
  SystemMenuRepository,
} from './system-menu.repository';
import type { CreateMenuDto, UpdateMenuDto } from './system-menu.dto';

@Injectable()
export class SeedSystemMenuRepository extends SystemMenuRepository {
  private menus = seedSystemMenus.map((menu) => ({ ...menu }));
  private readonly permissionCodes = new Set(seedSystemMenuPermissionCodes);

  async listMenus(): Promise<SystemMenuRecord[]> {
    return this.menus
      .map((menu) => ({ ...menu }))
      .sort(compareSystemMenuRecords);
  }

  async getMenu(key: string): Promise<SystemMenuRecord> {
    return { ...this.findMutableMenuByKey(key) };
  }

  async createMenu(body: CreateMenuDto): Promise<SystemMenuRecord> {
    const input = normalizeCreateSystemMenuInput(body);

    if (this.menus.some((menu) => menu.key === input.key)) {
      throw systemMenuConflict(
        'SYSTEM_MENU_ALREADY_EXISTS',
        'Menu already exists.',
        { key: input.key },
      );
    }

    this.assertPermissionCode(input.permissionCode);
    this.assertParentKey(input.parentKey, input.key);
    const menu: SystemMenuRecord = {
      ...input,
      stage: 'S6',
    };
    this.menus = [...this.menus, menu];
    return { ...menu };
  }

  async updateMenu(
    key: string,
    body: UpdateMenuDto,
  ): Promise<SystemMenuRecord> {
    const menu = this.findMutableMenuByKey(key);
    const input = normalizeUpdateSystemMenuInput(menu, body);

    this.assertParentKey(input.parentKey, key);

    if (input.permissionCode !== undefined) {
      this.assertPermissionCode(input.permissionCode);
      if (input.permissionCode === null) {
        delete menu.permissionCode;
      } else {
        menu.permissionCode = input.permissionCode;
      }
    }

    if (input.parentKey === null) {
      delete menu.parentKey;
    } else {
      menu.parentKey = input.parentKey;
    }

    Object.assign(menu, {
      title: input.title,
      type: input.type,
      path: input.path,
      icon: input.icon,
      component: input.component,
      order: input.order,
      status: input.status,
      cache: input.cache,
      hidden: input.hidden,
    });
    return { ...menu };
  }

  async deleteMenu(key: string): Promise<{ deleted: true }> {
    this.findMutableMenuByKey(key);
    if (this.menus.some((menu) => menu.parentKey === key)) {
      throw systemMenuBadRequest(
        'SYSTEM_MENU_HAS_CHILDREN',
        'Menu has child menus.',
        { key },
      );
    }

    this.menus = this.menus.filter((menu) => menu.key !== key);
    return { deleted: true };
  }

  private findMutableMenuByKey(key: string): SystemMenuRecord {
    const menu = this.menus.find((candidate) => candidate.key === key);

    if (!menu) {
      throw systemMenuNotFound('SYSTEM_MENU_NOT_FOUND', 'Menu not found.', {
        key,
      });
    }

    return menu;
  }

  private assertPermissionCode(
    permissionCode: string | null | undefined,
  ): void {
    if (permissionCode && !this.permissionCodes.has(permissionCode)) {
      throw systemMenuNotFound(
        'SYSTEM_MENU_PERMISSION_NOT_FOUND',
        'Permission not found.',
        { code: permissionCode },
      );
    }
  }

  private assertParentKey(
    parentKey: string | null | undefined,
    currentKey: string,
  ): void {
    if (!parentKey) {
      return;
    }

    if (!this.menus.some((menu) => menu.key === parentKey)) {
      throw systemMenuNotFound(
        'SYSTEM_MENU_PARENT_NOT_FOUND',
        'Parent menu not found.',
        { parentKey },
      );
    }

    let cursor: string | undefined = parentKey;
    const parentByKey = new Map(
      this.menus.map((menu) => [menu.key, menu.parentKey]),
    );

    while (cursor) {
      if (cursor === currentKey) {
        throw systemMenuBadRequest(
          'SYSTEM_MENU_PARENT_CYCLE',
          'Menu parent would create a cycle.',
          { key: currentKey },
        );
      }
      cursor = parentByKey.get(cursor);
    }
  }
}

import { Injectable } from '@nestjs/common';
import type { CreateMenuDto, UpdateMenuDto } from './system-menu.dto';
import type { SystemMenuRecord } from './system-menu.records';
import {
  createSystemMenuExportPreview,
  filterSystemMenusByPlanScope,
  SystemMenuRepository,
  type SystemMenuExportPreview,
  type SystemMenuPlanScope,
  systemMenuNotFound,
} from './system-menu.repository';

@Injectable()
export class SystemMenuService {
  constructor(private readonly repository: SystemMenuRepository) {}

  async listMenus(
    scope: SystemMenuPlanScope = {},
  ): Promise<SystemMenuRecord[]> {
    return filterSystemMenusByPlanScope(
      await this.repository.listMenus(),
      scope,
    );
  }

  async getMenu(
    key: string,
    scope: SystemMenuPlanScope = {},
  ): Promise<SystemMenuRecord> {
    const menu = (await this.listMenus(scope)).find((row) => row.key === key);

    if (!menu) {
      throw systemMenuNotFound('SYSTEM_MENU_NOT_FOUND', 'Menu not found.', {
        key,
      });
    }

    return menu;
  }

  createMenu(body: CreateMenuDto): Promise<SystemMenuRecord> {
    return this.repository.createMenu(body);
  }

  updateMenu(key: string, body: UpdateMenuDto): Promise<SystemMenuRecord> {
    return this.repository.updateMenu(key, body);
  }

  deleteMenu(key: string): Promise<{ deleted: true }> {
    return this.repository.deleteMenu(key);
  }

  async createExportPreview(
    scope: SystemMenuPlanScope = {},
  ): Promise<SystemMenuExportPreview> {
    return createSystemMenuExportPreview(await this.listMenus(scope));
  }
}

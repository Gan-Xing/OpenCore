import { Injectable } from '@nestjs/common';
import type { CreateMenuDto, UpdateMenuDto } from './system-menu.dto';
import type { SystemMenuRecord } from './system-menu.records';
import {
  createSystemMenuExportPreview,
  SystemMenuRepository,
  type SystemMenuExportPreview,
} from './system-menu.repository';

@Injectable()
export class SystemMenuService {
  constructor(private readonly repository: SystemMenuRepository) {}

  listMenus(): Promise<SystemMenuRecord[]> {
    return this.repository.listMenus();
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

  async createExportPreview(): Promise<SystemMenuExportPreview> {
    return createSystemMenuExportPreview(await this.repository.listMenus());
  }
}

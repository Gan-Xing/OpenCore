import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateSystemDeptDto,
  UpdateSystemDeptDto,
} from './system-dept.dto';
import {
  seedSystemDepts,
  type SystemDeptOptionRecord,
  type SystemDeptRecord,
  type SystemDeptTreeRecord,
} from './system-dept.records';
import {
  assertNoDeptChildren,
  assertNoDeptSelfParent,
  buildSystemDeptTree,
  compareSystemDeptRecords,
  normalizeCreateSystemDeptInput,
  normalizeSystemDeptFilters,
  normalizeUpdateSystemDeptInput,
  SystemDeptRepository,
  toSystemDeptOptionRecord,
  type SystemDeptQuery,
} from './system-dept.repository';

@Injectable()
export class SeedSystemDeptRepository extends SystemDeptRepository {
  private depts = seedSystemDepts.map((dept) => ({ ...dept }));

  async listDeptTree(
    query: SystemDeptQuery = {},
  ): Promise<SystemDeptTreeRecord[]> {
    const filters = normalizeSystemDeptFilters(query);
    const rows = this.depts
      .filter(
        (dept) =>
          (filters.enabled === undefined || dept.enabled === filters.enabled) &&
          (!filters.parentId || dept.parentId === filters.parentId),
      )
      .sort(compareSystemDeptRecords);

    return buildSystemDeptTree(rows);
  }

  async listDeptOptions(): Promise<SystemDeptOptionRecord[]> {
    return this.depts
      .filter((dept) => dept.enabled)
      .sort(compareSystemDeptRecords)
      .map(toSystemDeptOptionRecord);
  }

  async getDept(id: string): Promise<SystemDeptRecord> {
    return { ...this.findDept(id) };
  }

  async createDept(body: CreateSystemDeptDto): Promise<SystemDeptRecord> {
    const input = normalizeCreateSystemDeptInput(body);

    if (this.depts.some((dept) => dept.code === input.code)) {
      throw new ConflictException(`System dept already exists: ${input.code}`);
    }

    if (input.parentId) {
      this.findDept(input.parentId);
    }

    const now = new Date().toISOString();
    const dept: SystemDeptRecord = {
      id: `dept_${input.code.replace(/[^a-z0-9]+/g, '_')}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.depts = [...this.depts, dept];
    return { ...dept };
  }

  async updateDept(
    id: string,
    body: UpdateSystemDeptDto,
  ): Promise<SystemDeptRecord> {
    const dept = this.findDept(id);
    const input = normalizeUpdateSystemDeptInput(dept, body);
    assertNoDeptSelfParent(id, input.parentId);
    this.assertNoDeptCycle(id, input.parentId);

    Object.assign(dept, {
      ...input,
      updatedAt: new Date().toISOString(),
    });
    return { ...dept };
  }

  async deleteDept(id: string): Promise<{ deleted: true }> {
    this.findDept(id);
    assertNoDeptChildren(
      this.depts.filter((dept) => dept.parentId === id).length,
    );
    this.depts = this.depts.filter((dept) => dept.id !== id);
    return { deleted: true };
  }

  private findDept(id: string): SystemDeptRecord {
    const dept = this.depts.find((candidate) => candidate.id === id);

    if (!dept) {
      throw new NotFoundException(`System dept not found: ${id}`);
    }

    return dept;
  }

  private assertNoDeptCycle(id: string, parentId?: string): void {
    let currentParentId = parentId;

    while (currentParentId) {
      if (currentParentId === id) {
        throw new BadRequestException(
          'System dept parent cannot be one of its descendants.',
        );
      }

      currentParentId = this.findDept(currentParentId).parentId;
    }
  }
}

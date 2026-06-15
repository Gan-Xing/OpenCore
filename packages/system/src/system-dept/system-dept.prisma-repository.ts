import { Injectable } from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import type {
  CreateSystemDeptDto,
  UpdateSystemDeptOrderDto,
  UpdateSystemDeptDto,
} from './system-dept.dto';
import type {
  SystemDeptOptionRecord,
  SystemDeptRecord,
  SystemDeptTreeRecord,
} from './system-dept.records';
import {
  assertNoDeptChildren,
  assertNoDeptSelfParent,
  assertNoDeptUsers,
  assertSameDeptParent,
  buildSystemDeptTree,
  compareSystemDeptRecords,
  normalizeCreateSystemDeptInput,
  normalizeSystemDeptFilters,
  normalizeUpdateSystemDeptOrderInput,
  normalizeUpdateSystemDeptInput,
  systemDeptBadRequest,
  systemDeptConflict,
  systemDeptNotFound,
  SystemDeptRepository,
  toSystemDeptOptionRecord,
  type SystemDeptQuery,
} from './system-dept.repository';

type PrismaSystemDept = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  order: number;
  leader: string | null;
  phone: string | null;
  email: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaSystemDeptRepository extends SystemDeptRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listDeptTree(
    query: SystemDeptQuery = {},
  ): Promise<SystemDeptTreeRecord[]> {
    const filters = normalizeSystemDeptFilters(query);
    const rows = await this.prisma.systemDept.findMany({
      where: {
        ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }),
        ...(filters.parentId ? { parentId: filters.parentId } : {}),
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return buildSystemDeptTree(rows.map(toSystemDeptRecord));
  }

  async listDeptOptions(): Promise<SystemDeptOptionRecord[]> {
    const rows = await this.prisma.systemDept.findMany({
      where: { enabled: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return rows.map(toSystemDeptRecord).map(toSystemDeptOptionRecord);
  }

  async getDept(id: string): Promise<SystemDeptRecord> {
    return toSystemDeptRecord(await this.findDeptById(id));
  }

  async createDept(body: CreateSystemDeptDto): Promise<SystemDeptRecord> {
    const input = normalizeCreateSystemDeptInput(body);

    if (
      await this.prisma.systemDept.findUnique({ where: { code: input.code } })
    ) {
      throw systemDeptConflict(
        'SYSTEM_DEPT_ALREADY_EXISTS',
        'System dept already exists.',
        { code: input.code },
      );
    }

    if (input.parentId) {
      await this.findDeptById(input.parentId);
    }

    const dept = await this.prisma.systemDept.create({
      data: input,
    });

    return toSystemDeptRecord(dept);
  }

  async updateDept(
    id: string,
    body: UpdateSystemDeptDto,
  ): Promise<SystemDeptRecord> {
    const existing = toSystemDeptRecord(await this.findDeptById(id));
    const input = normalizeUpdateSystemDeptInput(existing, body);
    assertNoDeptSelfParent(id, input.parentId);
    await this.assertNoDeptCycle(id, input.parentId);
    const dept = await this.prisma.systemDept.update({
      where: { id },
      data: input,
    });

    return toSystemDeptRecord(dept);
  }

  async updateDeptOrder(
    body: UpdateSystemDeptOrderDto,
  ): Promise<{ updatedCount: number; items: SystemDeptRecord[] }> {
    const input = normalizeUpdateSystemDeptOrderInput(body);
    const ids = input.map((item) => item.id);
    const existing = (
      await this.prisma.systemDept.findMany({
        where: { id: { in: ids } },
      })
    ).map(toSystemDeptRecord);

    assertFoundDeptIds(ids, existing);
    assertSameDeptParent(existing);

    const updated = await this.prisma.$transaction(
      input.map((item) =>
        this.prisma.systemDept.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return {
      updatedCount: updated.length,
      items: updated.map(toSystemDeptRecord).sort(compareSystemDeptRecords),
    };
  }

  async deleteDept(id: string): Promise<{ deleted: true }> {
    await this.findDeptById(id);
    assertNoDeptChildren(
      await this.prisma.systemDept.count({ where: { parentId: id } }),
    );
    assertNoDeptUsers(await this.prisma.user.count({ where: { deptId: id } }));
    await this.prisma.systemDept.delete({ where: { id } });
    return { deleted: true };
  }

  private async findDeptById(id: string): Promise<PrismaSystemDept> {
    const dept = await this.prisma.systemDept.findUnique({ where: { id } });

    if (!dept) {
      throw systemDeptNotFound(
        'SYSTEM_DEPT_NOT_FOUND',
        'System dept not found.',
        {
          id,
        },
      );
    }

    return dept;
  }

  private async assertNoDeptCycle(
    id: string,
    parentId?: string,
  ): Promise<void> {
    let currentParentId = parentId;

    while (currentParentId) {
      if (currentParentId === id) {
        throw systemDeptBadRequest(
          'SYSTEM_DEPT_PARENT_DESCENDANT',
          'System dept parent cannot be one of its descendants.',
          { id },
        );
      }

      currentParentId =
        (await this.findDeptById(currentParentId)).parentId ?? undefined;
    }
  }
}

function toSystemDeptRecord(dept: PrismaSystemDept): SystemDeptRecord {
  return {
    id: dept.id,
    code: dept.code,
    name: dept.name,
    parentId: dept.parentId ?? undefined,
    order: dept.order,
    leader: dept.leader ?? undefined,
    phone: dept.phone ?? undefined,
    email: dept.email ?? undefined,
    enabled: dept.enabled,
    createdAt: dept.createdAt.toISOString(),
    updatedAt: dept.updatedAt.toISOString(),
  };
}

function assertFoundDeptIds(
  expectedIds: readonly string[],
  rows: readonly SystemDeptRecord[],
): void {
  const foundIds = new Set(rows.map((row) => row.id));
  const missingIds = expectedIds.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    throw systemDeptNotFound(
      'SYSTEM_DEPT_NOT_FOUND',
      'System dept not found.',
      { ids: missingIds },
    );
  }
}

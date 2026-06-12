import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import type {
  CreateSystemDeptDto,
  UpdateSystemDeptDto,
} from './system-dept.dto';
import type {
  SystemDeptRecord,
  SystemDeptTreeRecord,
} from './system-dept.records';
import {
  assertNoDeptChildren,
  assertNoDeptSelfParent,
  buildSystemDeptTree,
  normalizeCreateSystemDeptInput,
  normalizeSystemDeptFilters,
  normalizeUpdateSystemDeptInput,
  SystemDeptRepository,
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

  async createDept(body: CreateSystemDeptDto): Promise<SystemDeptRecord> {
    const input = normalizeCreateSystemDeptInput(body);

    if (
      await this.prisma.systemDept.findUnique({ where: { code: input.code } })
    ) {
      throw new ConflictException(`System dept already exists: ${input.code}`);
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

  async deleteDept(id: string): Promise<{ deleted: true }> {
    await this.findDeptById(id);
    assertNoDeptChildren(
      await this.prisma.systemDept.count({ where: { parentId: id } }),
    );
    await this.prisma.systemDept.delete({ where: { id } });
    return { deleted: true };
  }

  private async findDeptById(id: string): Promise<PrismaSystemDept> {
    const dept = await this.prisma.systemDept.findUnique({ where: { id } });

    if (!dept) {
      throw new NotFoundException(`System dept not found: ${id}`);
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
        throw new BadRequestException(
          'System dept parent cannot be one of its descendants.',
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

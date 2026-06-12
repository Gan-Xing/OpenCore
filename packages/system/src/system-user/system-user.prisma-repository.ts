import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import type { CreateUserDto, UpdateUserDto } from './system-user.dto';
import { hashSystemUserPassword } from './system-user.password';
import {
  normalizeCreateSystemUserInput,
  normalizeUpdateSystemUserInput,
  SystemUserRepository,
  type SystemUserSummaryRecord,
} from './system-user.repository';

type PrismaUserWithRoles = {
  id: string;
  username: string;
  displayName: string;
  deptId?: string | null;
  enabled: boolean;
  roles: Array<{ role: { code: string } }>;
};

@Injectable()
export class PrismaSystemUserRepository extends SystemUserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listUsers(): Promise<SystemUserSummaryRecord[]> {
    const users = await this.prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { username: 'asc' },
    });

    return users.map(toSystemUserSummaryRecord);
  }

  async createUser(body: CreateUserDto): Promise<SystemUserSummaryRecord> {
    const input = normalizeCreateSystemUserInput(body);

    if (
      await this.prisma.user.findUnique({ where: { username: input.username } })
    ) {
      throw new ConflictException(`User already exists: ${input.username}`);
    }

    await this.assertRolesExist(input.roleCodes);
    await this.assertDeptExists(input.deptId);
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        displayName: input.displayName,
        passwordHash: hashSystemUserPassword(input.password),
        deptId: input.deptId,
        enabled: input.enabled,
        roles: {
          create: input.roleCodes.map((roleCode) => ({
            role: { connect: { code: roleCode } },
          })),
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return toSystemUserSummaryRecord(user);
  }

  async updateUser(
    id: string,
    body: UpdateUserDto,
  ): Promise<SystemUserSummaryRecord> {
    await this.findUserEntityById(id);
    const input = normalizeUpdateSystemUserInput(body);

    if (input.roleCodes !== undefined) {
      await this.assertRolesExist(input.roleCodes);
    }
    if (input.deptId !== undefined) {
      await this.assertDeptExists(input.deptId);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: input.displayName,
        passwordHash: input.password
          ? hashSystemUserPassword(input.password)
          : undefined,
        deptId: input.deptId,
        enabled: input.enabled,
        ...(input.roleCodes === undefined
          ? {}
          : {
              roles: {
                deleteMany: {},
                create: input.roleCodes.map((roleCode) => ({
                  role: { connect: { code: roleCode } },
                })),
              },
            }),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return toSystemUserSummaryRecord(user);
  }

  async deleteUser(id: string): Promise<{ deleted: true }> {
    await this.findUserEntityById(id);
    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  private async findUserEntityById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User not found: ${id}`);
    }

    return user;
  }

  private async assertRolesExist(roleCodes: readonly string[]): Promise<void> {
    const roles = await this.prisma.role.findMany({
      where: { code: { in: [...roleCodes] } },
      select: { code: true },
    });
    const existing = new Set(roles.map((role) => role.code));
    const missing = roleCodes.find((roleCode) => !existing.has(roleCode));

    if (missing) {
      throw new NotFoundException(`Role not found: ${missing}`);
    }
  }

  private async assertDeptExists(
    deptId: string | null | undefined,
  ): Promise<void> {
    if (!deptId) {
      return;
    }

    const dept = await this.prisma.systemDept.findUnique({
      where: { id: deptId },
      select: { id: true },
    });

    if (!dept) {
      throw new NotFoundException(`System dept not found: ${deptId}`);
    }
  }
}

function toSystemUserSummaryRecord(
  user: PrismaUserWithRoles,
): SystemUserSummaryRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    roleCodes: user.roles.map((userRole) => userRole.role.code).sort(),
    deptId: user.deptId ?? undefined,
    enabled: user.enabled,
  };
}

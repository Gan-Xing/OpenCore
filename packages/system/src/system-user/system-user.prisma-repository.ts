import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@opencore/database';
import type { CreateUserDto, UpdateUserDto } from './system-user.dto';
import { hashSystemUserPassword } from './system-user.password';
import {
  assertSystemUserMutable,
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

const SYSTEM_USER_IDS = new Set(['user_admin']);
const SYSTEM_USERNAMES = new Set(['admin']);

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

  async getUser(id: string): Promise<SystemUserSummaryRecord> {
    return toSystemUserSummaryRecord(await this.findUserEntityById(id));
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
    const existing = toSystemUserSummaryRecord(
      await this.findUserEntityById(id),
    );
    const input = normalizeUpdateSystemUserInput(body);

    assertSystemUserMutable(existing);

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
    const user = toSystemUserSummaryRecord(await this.findUserEntityById(id));

    assertSystemUserMutable(user);

    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  private async findUserEntityById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

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
    system: isSystemUser(user),
  };
}

function isSystemUser(user: Pick<PrismaUserWithRoles, 'id' | 'username'>) {
  return SYSTEM_USER_IDS.has(user.id) || SYSTEM_USERNAMES.has(user.username);
}

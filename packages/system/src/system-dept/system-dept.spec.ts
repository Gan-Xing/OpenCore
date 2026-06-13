import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemDeptRepository } from './system-dept.prisma-repository';
import { SeedSystemDeptRepository } from './system-dept.seed-repository';
import { SystemDeptService } from './system-dept.service';

describe('@opencore/system system-dept', () => {
  it('supports seeded dept trees, CRUD and export previews', async () => {
    const service = new SystemDeptService(new SeedSystemDeptRepository());

    await expect(service.listDeptTree()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'dept_headquarters',
          children: expect.arrayContaining([
            expect.objectContaining({ id: 'dept_engineering' }),
          ]),
        }),
      ]),
    );
    await expect(service.listDeptOptions()).resolves.toEqual(
      expect.arrayContaining([
        {
          id: 'dept_engineering',
          name: 'Engineering',
          parentId: 'dept_headquarters',
          order: 20,
        },
      ]),
    );

    const dept = await service.createDept({
      code: 'qa',
      name: 'Quality Assurance',
      parentId: 'dept_engineering',
      order: 25,
      enabled: true,
    });

    expect(dept.parentId).toBe('dept_engineering');
    await expect(service.getDept(dept.id)).resolves.toMatchObject({
      id: dept.id,
      name: 'Quality Assurance',
    });
    await expect(
      service.updateDept(dept.id, { name: 'Quality Platform', enabled: false }),
    ).resolves.toMatchObject({
      name: 'Quality Platform',
      enabled: false,
    });
    await expect(service.listDeptOptions()).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: dept.id,
        }),
      ]),
    );

    const sibling = await service.createDept({
      code: 'qa-docs',
      name: 'Quality Docs',
      parentId: 'dept_engineering',
      order: 30,
      enabled: true,
    });
    await expect(
      service.updateDeptOrder({
        items: [
          { id: sibling.id, order: 1 },
          { id: dept.id, order: 2 },
        ],
      }),
    ).resolves.toMatchObject({
      updatedCount: 2,
      items: [
        expect.objectContaining({ id: sibling.id, order: 1 }),
        expect.objectContaining({ id: dept.id, order: 2 }),
      ],
    });
    await expect(
      service.updateDeptOrder({
        items: [
          { id: dept.id, order: 10 },
          { id: dept.id, order: 20 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateDeptOrder({
        items: [
          { id: dept.id, order: 10 },
          { id: 'dept_operations', order: 20 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.deleteDept(sibling.id)).resolves.toEqual({
      deleted: true,
    });
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-system-depts.csv',
      scope: 'current-page',
      columns: ['code', 'name', 'parentId', 'enabled'],
    });
    await expect(service.deleteDept(dept.id)).resolves.toEqual({
      deleted: true,
    });
  });

  it('rejects dept cycles and deleting parents with children', async () => {
    const service = new SystemDeptService(new SeedSystemDeptRepository());

    await expect(
      service.updateDept('dept_engineering', {
        parentId: 'dept_engineering',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.deleteDept('dept_headquarters')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects deleting departments with assigned users', async () => {
    const service = new SystemDeptService(
      new SeedSystemDeptRepository([
        {
          id: 'user_ops',
          username: 'ops',
          displayName: 'Operations User',
          passwordHash: 'hash',
          roleCodes: ['viewer'],
          deptId: 'dept_operations',
          postCodes: [],
          enabled: true,
          system: false,
        },
      ]),
    );

    await expect(service.deleteDept('dept_operations')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.getDept('dept_operations')).resolves.toMatchObject({
      id: 'dept_operations',
    });
  });

  describe('PrismaSystemDeptRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemDeptService(
      new PrismaSystemDeptRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const parentCode = `dept_parent_${testRunId}`;
    const childCode = `dept_child_${testRunId}`;
    const siblingCode = `dept_sibling_${testRunId}`;
    const boundCode = `dept_bound_${testRunId}`;
    const boundUsername = `dept_user_${testRunId}`;
    let parentId = '';
    let childId = '';
    let siblingId = '';
    let boundDeptId = '';

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('reads seeded dept trees from PostgreSQL', async () => {
      await expect(service.listDeptTree()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'dept_headquarters',
            children: expect.arrayContaining([
              expect.objectContaining({ id: 'dept_engineering' }),
            ]),
          }),
        ]),
      );
      await expect(service.listDeptOptions()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'dept_operations',
            parentId: 'dept_headquarters',
          }),
        ]),
      );
    });

    it('persists dept tree CRUD and prevents deleting parents through Prisma', async () => {
      const parent = await service.createDept({
        code: parentCode,
        name: 'Prisma Parent Dept',
        order: 40,
      });
      parentId = parent.id;
      const child = await service.createDept({
        code: childCode,
        name: 'Prisma Child Dept',
        parentId,
        order: 50,
      });
      childId = child.id;
      const sibling = await service.createDept({
        code: siblingCode,
        name: 'Prisma Sibling Dept',
        parentId,
        order: 60,
      });
      siblingId = sibling.id;

      await expect(service.getDept(parentId)).resolves.toMatchObject({
        id: parentId,
        code: parentCode,
      });
      await expect(service.deleteDept(parentId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.updateDept(parentId, { parentId: childId }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateDeptOrder({
          items: [
            { id: siblingId, order: 1 },
            { id: childId, order: 2 },
          ],
        }),
      ).resolves.toMatchObject({
        updatedCount: 2,
        items: [
          expect.objectContaining({ id: siblingId, order: 1 }),
          expect.objectContaining({ id: childId, order: 2 }),
        ],
      });
      await expect(
        service.updateDeptOrder({
          items: [
            { id: childId, order: 10 },
            { id: 'dept_engineering', order: 20 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateDeptOrder({
          items: [{ id: `missing_${childId}`, order: 10 }],
        }),
      ).rejects.toThrow();
      await expect(service.deleteDept(childId)).resolves.toEqual({
        deleted: true,
      });
      childId = '';
      await expect(service.deleteDept(siblingId)).resolves.toEqual({
        deleted: true,
      });
      siblingId = '';
      await expect(service.deleteDept(parentId)).resolves.toEqual({
        deleted: true,
      });
      parentId = '';
    });

    it('prevents deleting a department with assigned users through Prisma', async () => {
      const dept = await service.createDept({
        code: boundCode,
        name: 'Bound User Dept',
        order: 60,
      });
      boundDeptId = dept.id;
      const user = await prisma.user.create({
        data: {
          username: boundUsername,
          displayName: 'Bound Dept User',
          passwordHash: 'hash',
          deptId: boundDeptId,
          enabled: true,
        },
      });

      await expect(service.deleteDept(boundDeptId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        prisma.user.findUnique({ where: { id: user.id } }),
      ).resolves.toEqual(
        expect.objectContaining({
          deptId: boundDeptId,
        }),
      );

      await prisma.user.delete({ where: { id: user.id } });
      await expect(service.deleteDept(boundDeptId)).resolves.toEqual({
        deleted: true,
      });
      boundDeptId = '';
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.user.deleteMany({
        where: { username: boundUsername },
      });
      await prisma.systemDept.deleteMany({
        where: { code: { in: [childCode, siblingCode] } },
      });
      await prisma.systemDept.deleteMany({
        where: { code: { in: [parentCode, boundCode] } },
      });
      parentId = '';
      childId = '';
      siblingId = '';
      boundDeptId = '';
    }
  });
});

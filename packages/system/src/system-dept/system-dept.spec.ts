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

  describe('PrismaSystemDeptRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemDeptService(
      new PrismaSystemDeptRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const parentCode = `dept_parent_${testRunId}`;
    const childCode = `dept_child_${testRunId}`;
    let parentId = '';
    let childId = '';

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
      await expect(service.deleteDept(childId)).resolves.toEqual({
        deleted: true,
      });
      childId = '';
      await expect(service.deleteDept(parentId)).resolves.toEqual({
        deleted: true,
      });
      parentId = '';
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.systemDept.deleteMany({
        where: { code: { in: [childCode] } },
      });
      await prisma.systemDept.deleteMany({
        where: { code: { in: [parentCode] } },
      });
      parentId = '';
      childId = '';
    }
  });
});

import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemPostRepository } from './system-post.prisma-repository';
import { SeedSystemPostRepository } from './system-post.seed-repository';
import { SystemPostService } from './system-post.service';

describe('@opencore/system system-post', () => {
  it('supports seeded post CRUD, filters and export previews', async () => {
    const service = new SystemPostService(new SeedSystemPostRepository());

    await expect(service.listPosts({ page: 1, pageSize: 1 })).resolves.toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 1,
        total: 2,
        totalPages: 2,
      }),
    );

    const post = await service.createPost({
      code: 'qa',
      name: 'Quality Assurance',
      order: 30,
      enabled: true,
    });

    expect(post.code).toBe('qa');
    await expect(
      service.updatePost('qa', { name: 'Quality Platform', enabled: false }),
    ).resolves.toMatchObject({
      name: 'Quality Platform',
      enabled: false,
    });
    await expect(service.listPosts({ enabled: 'false' })).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ code: 'qa' }),
        ]),
      }),
    );
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-system-posts.csv',
      scope: 'current-page',
      columns: ['code', 'name', 'order', 'enabled'],
    });
    await expect(service.deletePost('qa')).resolves.toEqual({ deleted: true });
  });

  it('rejects invalid post codes and order values', async () => {
    const service = new SystemPostService(new SeedSystemPostRepository());

    await expect(
      service.createPost({
        code: 'Invalid Code',
        name: 'Invalid',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createPost({
        code: 'invalid-order',
        name: 'Invalid',
        order: -1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('PrismaSystemPostRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemPostService(
      new PrismaSystemPostRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const code = `post_${testRunId}`;

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('reads seeded posts from PostgreSQL', async () => {
      await expect(
        service.listPosts({ page: 1, pageSize: 20 }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ code: 'admin' }),
          ]),
        }),
      );
    });

    it('persists post CRUD through Prisma', async () => {
      const post = await service.createPost({
        code,
        name: 'Prisma Test Post',
        order: 40,
        enabled: true,
      });

      expect(post.code).toBe(code);
      await expect(
        service.updatePost(code, {
          description: 'Updated by integration test.',
          enabled: false,
        }),
      ).resolves.toMatchObject({
        description: 'Updated by integration test.',
        enabled: false,
      });
      await expect(service.deletePost(code)).resolves.toEqual({
        deleted: true,
      });
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.systemPost.deleteMany({
        where: { code },
      });
    }
  });
});

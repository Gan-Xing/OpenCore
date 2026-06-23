import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '@opencore/core';
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
    await expect(service.getPost('qa')).resolves.toMatchObject({
      code: 'qa',
      name: 'Quality Assurance',
    });
    await expect(
      service.updatePost('qa', { name: 'Quality Platform', enabled: false }),
    ).resolves.toMatchObject({
      name: 'Quality Platform',
      enabled: false,
    });
    await expect(service.listPostOptions()).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'qa' })]),
    );
    await expect(service.listPosts({ enabled: 'false' })).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ code: 'qa' }),
        ]),
      }),
    );
    await expect(
      service.updatePost('qa', { enabled: true, order: 5 }),
    ).resolves.toMatchObject({
      enabled: true,
      order: 5,
    });
    await expect(service.listPostOptions()).resolves.toEqual(
      expect.arrayContaining([
        {
          code: 'qa',
          name: 'Quality Platform',
          order: 5,
        },
      ]),
    );
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-system-posts.csv',
      scope: 'current-page',
      columns: ['code', 'name', 'order', 'enabled'],
    });
    await service.createPost({
      code: 'qa_batch_a',
      name: 'Quality Batch A',
      order: 31,
    });
    await service.createPost({
      code: 'qa_batch_b',
      name: 'Quality Batch B',
      order: 32,
    });
    await expectHttpExceptionCode(
      service.deletePosts({ codes: [] }),
      'SYSTEM_POST_CODES_EMPTY',
    );
    await expectHttpExceptionCode(
      service.deletePosts({ codes: ['qa_batch_a', 'qa_batch_a'] }),
      'SYSTEM_POST_CODE_DUPLICATED',
    );
    await expectHttpExceptionCode(
      service.deletePosts({ codes: ['qa_batch_a', 'missing_post'] }),
      'SYSTEM_POST_NOT_FOUND',
    );
    await expect(service.getPost('qa_batch_a')).resolves.toMatchObject({
      code: 'qa_batch_a',
    });
    await expect(
      service.deletePosts({ codes: ['qa_batch_b', 'qa_batch_a'] }),
    ).resolves.toEqual({
      deleted: true,
      affected: 2,
      codes: ['qa_batch_a', 'qa_batch_b'],
    });
    await expectHttpExceptionCode(
      service.getPost('qa_batch_a'),
      'SYSTEM_POST_NOT_FOUND',
    );
    await expectHttpExceptionCode(
      service.getPost('qa_batch_b'),
      'SYSTEM_POST_NOT_FOUND',
    );

    await service.createPost({
      code: 'qa_order_a',
      name: 'Quality Order A',
      order: 40,
    });
    await service.createPost({
      code: 'qa_order_b',
      name: 'Quality Order B',
      order: 50,
    });
    await expect(
      service.updatePostOrder({
        items: [
          { code: 'qa_order_b', order: 10 },
          { code: 'qa_order_a', order: 20 },
        ],
      }),
    ).resolves.toMatchObject({
      updatedCount: 2,
      items: [
        expect.objectContaining({ code: 'qa_order_b', order: 10 }),
        expect.objectContaining({ code: 'qa_order_a', order: 20 }),
      ],
    });
    await expectHttpExceptionCode(
      service.updatePostOrder({
        items: [
          { code: 'qa_order_a', order: 10 },
          { code: 'qa_order_a', order: 20 },
        ],
      }),
      'SYSTEM_POST_ORDER_ITEM_CODE_DUPLICATED',
    );
    await expectHttpExceptionCode(
      service.updatePostOrder({
        items: [
          { code: 'qa_order_a', order: 10 },
          { code: 'missing_order_post', order: 20 },
        ],
      }),
      'SYSTEM_POST_NOT_FOUND',
    );

    await service.deletePost('qa_order_a');
    await service.deletePost('qa_order_b');
    await expect(service.deletePost('qa')).resolves.toEqual({ deleted: true });
  });

  it('rejects invalid post codes and order values', async () => {
    const service = new SystemPostService(new SeedSystemPostRepository());

    await expectHttpExceptionCode(
      service.createPost({
        code: 'Invalid Code',
        name: 'Invalid',
      }),
      'SYSTEM_POST_CODE_INVALID',
    );
    await expectHttpExceptionCode(
      service.createPost({
        code: 'invalid-order',
        name: 'Invalid',
        order: -1,
      }),
      'SYSTEM_POST_ORDER_INVALID',
    );
  });

  describe('PrismaSystemPostRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemPostService(
      new PrismaSystemPostRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const code = `post_${testRunId}`;
    const tenantId = `tenant_post_${testRunId}`;
    const batchCodeA = `${code}_batch_a`;
    const batchCodeB = `${code}_batch_b`;
    const orderCodeA = `${code}_order_a`;
    const orderCodeB = `${code}_order_b`;

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
      await expect(service.listPostOptions()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'admin',
            name: 'Administrator',
          }),
        ]),
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
      await expect(service.getPost(code)).resolves.toMatchObject({
        code,
        name: 'Prisma Test Post',
      });
      await expect(
        service.updatePost(code, {
          description: 'Updated by integration test.',
          enabled: false,
        }),
      ).resolves.toMatchObject({
        description: 'Updated by integration test.',
        enabled: false,
      });
      await expect(service.listPostOptions()).resolves.not.toEqual(
        expect.arrayContaining([expect.objectContaining({ code })]),
      );
      await expect(
        service.updatePost(code, {
          enabled: true,
          order: 5,
        }),
      ).resolves.toMatchObject({
        enabled: true,
        order: 5,
      });
      await expect(service.listPostOptions()).resolves.toEqual(
        expect.arrayContaining([
          {
            code,
            name: 'Prisma Test Post',
            order: 5,
          },
        ]),
      );
      await expect(service.deletePost(code)).resolves.toEqual({
        deleted: true,
      });
    });

    it('persists batch post deletion through Prisma', async () => {
      await service.createPost({
        code: batchCodeA,
        name: 'Prisma Batch A',
        order: 41,
      });
      await service.createPost({
        code: batchCodeB,
        name: 'Prisma Batch B',
        order: 42,
      });

      await expectHttpExceptionCode(
        service.deletePosts({ codes: [batchCodeA, 'missing_post'] }),
        'SYSTEM_POST_NOT_FOUND',
      );
      await expect(service.getPost(batchCodeA)).resolves.toMatchObject({
        code: batchCodeA,
      });

      await expect(
        service.deletePosts({ codes: [batchCodeB, batchCodeA] }),
      ).resolves.toEqual({
        deleted: true,
        affected: 2,
        codes: [batchCodeA, batchCodeB],
      });
      await expect(
        prisma.systemPost.findMany({
          where: { code: { in: [batchCodeA, batchCodeB] } },
        }),
      ).resolves.toEqual([]);
    });

    it('persists post order updates through Prisma', async () => {
      await service.createPost({
        code: orderCodeA,
        name: 'Prisma Order A',
        order: 61,
        enabled: true,
      });
      await service.createPost({
        code: orderCodeB,
        name: 'Prisma Order B',
        order: 62,
        enabled: true,
      });

      await expect(
        service.updatePostOrder({
          items: [
            { code: orderCodeB, order: 10 },
            { code: orderCodeA, order: 20 },
          ],
        }),
      ).resolves.toMatchObject({
        updatedCount: 2,
        items: [
          expect.objectContaining({ code: orderCodeB, order: 10 }),
          expect.objectContaining({ code: orderCodeA, order: 20 }),
        ],
      });
      await expectHttpExceptionCode(
        service.updatePostOrder({
          items: [
            { code: orderCodeA, order: 10 },
            { code: 'missing_order_post', order: 20 },
          ],
        }),
        'SYSTEM_POST_NOT_FOUND',
      );
      await expect(service.getPost(orderCodeA)).resolves.toMatchObject({
        code: orderCodeA,
        order: 20,
      });
      await expect(service.listPostOptions()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: orderCodeB, order: 10 }),
          expect.objectContaining({ code: orderCodeA, order: 20 }),
        ]),
      );
    });

    it('scopes post codes to the active tenant context', async () => {
      await prisma.tenant.create({
        data: {
          id: tenantId,
          code: tenantId,
          slug: tenantId,
          name: 'Tenant Post Scope Test',
        },
      });
      await service.createPost({
        code,
        name: 'Root Scoped Post',
        order: 30,
        enabled: true,
      });
      await runInTenant(tenantId, () =>
        service.createPost({
          code,
          name: 'Tenant Scoped Post',
          order: 40,
          enabled: true,
        }),
      );

      await expect(service.getPost(code)).resolves.toMatchObject({
        code,
        name: 'Root Scoped Post',
      });
      await expect(
        runInTenant(tenantId, () => service.getPost(code)),
      ).resolves.toMatchObject({
        code,
        name: 'Tenant Scoped Post',
      });
      await expect(
        runInTenant(tenantId, () =>
          service.listPosts({ page: 1, pageSize: 20 }),
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          items: [
            expect.objectContaining({
              code,
              name: 'Tenant Scoped Post',
            }),
          ],
        }),
      );
      await expect(
        runInTenant(tenantId, () => service.listPostOptions()),
      ).resolves.toEqual([
        expect.objectContaining({
          code,
          name: 'Tenant Scoped Post',
        }),
      ]);
      await expectHttpExceptionCode(
        service.createPost({
          code,
          name: 'Duplicate Root Post',
        }),
        'SYSTEM_POST_ALREADY_EXISTS',
      );
      await expectHttpExceptionCode(
        runInTenant(tenantId, () =>
          service.createPost({
            code,
            name: 'Duplicate Tenant Post',
          }),
        ),
        'SYSTEM_POST_ALREADY_EXISTS',
      );
      await expect(
        prisma.systemPost.findMany({
          where: { code },
          select: { tenantId: true, name: true },
        }),
      ).resolves.toEqual(
        expect.arrayContaining([
          { tenantId: 'tenant_root', name: 'Root Scoped Post' },
          { tenantId, name: 'Tenant Scoped Post' },
        ]),
      );
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.systemPost.deleteMany({
        where: {
          code: { in: [code, batchCodeA, batchCodeB, orderCodeA, orderCodeB] },
        },
      });
      await prisma.tenant.deleteMany({
        where: { id: tenantId },
      });
    }
  });
});

function runInTenant<T>(tenantId: string, callback: () => T): T {
  return runWithRequestContext(
    {
      requestId: `test-${tenantId}`,
      traceId: `test-${tenantId}`,
      tenantId,
    },
    callback,
  );
}

async function expectHttpExceptionCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  return undefined;
}

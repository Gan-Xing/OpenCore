import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { getRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import type {
  BatchDeleteSystemPostsDto,
  CreateSystemPostDto,
  UpdateSystemPostOrderDto,
  UpdateSystemPostDto,
} from './system-post.dto';
import type { SystemPostRecord } from './system-post.records';
import {
  createSystemPostPageResult,
  compareSystemPostRecords,
  normalizeBatchDeleteSystemPostsInput,
  normalizeCreateSystemPostInput,
  normalizeSystemPostFilters,
  normalizeSystemPostPageQuery,
  normalizeUpdateSystemPostOrderInput,
  normalizeUpdateSystemPostInput,
  systemPostConflict,
  systemPostNotFound,
  SystemPostRepository,
  type SystemPostBatchMutationRecord,
  type SystemPostOrderMutationResult,
  type SystemPostOptionRecord,
  type SystemPostPageQuery,
} from './system-post.repository';

type PrismaSystemPost = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  order: number;
  description: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const ROOT_TENANT_ID = 'tenant_root';

@Injectable()
export class PrismaSystemPostRepository extends SystemPostRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listPosts(
    query: SystemPostPageQuery = {},
  ): Promise<PageResult<SystemPostRecord>> {
    const filters = normalizeSystemPostFilters(query);
    const tenantId = resolveCurrentTenantId();
    const where = {
      tenantId,
      ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }),
    };
    const total = await this.prisma.systemPost.count({ where });
    const pagination = normalizeSystemPostPageQuery(query, total);
    const rows = await this.prisma.systemPost.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemPostPageResult(rows.map(toSystemPostRecord), pagination);
  }

  async listPostOptions(): Promise<readonly SystemPostOptionRecord[]> {
    const tenantId = resolveCurrentTenantId();
    return this.prisma.systemPost.findMany({
      where: { tenantId, enabled: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: {
        code: true,
        name: true,
        order: true,
      },
    });
  }

  async getPost(code: string): Promise<SystemPostRecord> {
    return toSystemPostRecord(await this.findPostByCode(code));
  }

  async createPost(body: CreateSystemPostDto): Promise<SystemPostRecord> {
    const input = normalizeCreateSystemPostInput(body);
    const tenantId = resolveCurrentTenantId();

    if (
      await this.prisma.systemPost.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: input.code,
          },
        },
      })
    ) {
      throw systemPostConflict(
        'SYSTEM_POST_ALREADY_EXISTS',
        'System post already exists.',
        { code: input.code, tenantId },
      );
    }

    const post = await this.prisma.systemPost.create({
      data: { ...input, tenantId },
    });
    return toSystemPostRecord(post);
  }

  async updatePost(
    code: string,
    body: UpdateSystemPostDto,
  ): Promise<SystemPostRecord> {
    const existingEntity = await this.findPostByCode(code);
    const existing = toSystemPostRecord(existingEntity);
    const post = await this.prisma.systemPost.update({
      where: {
        tenantId_code: {
          tenantId: existingEntity.tenantId,
          code,
        },
      },
      data: normalizeUpdateSystemPostInput(existing, body),
    });

    return toSystemPostRecord(post);
  }

  async deletePost(code: string): Promise<{ deleted: true }> {
    const post = await this.findPostByCode(code);
    await this.prisma.systemPost.delete({ where: { id: post.id } });
    return { deleted: true };
  }

  async deletePosts(
    body: BatchDeleteSystemPostsDto,
  ): Promise<SystemPostBatchMutationRecord> {
    const codes = normalizeBatchDeleteSystemPostsInput(body);
    const tenantId = resolveCurrentTenantId();
    const posts = await this.prisma.systemPost.findMany({
      where: { tenantId, code: { in: [...codes] } },
      select: { id: true, code: true },
    });
    const existingCodes = new Set(posts.map((post) => post.code));
    const missing = codes.find((code) => !existingCodes.has(code));

    if (missing) {
      throw systemPostNotFound(
        'SYSTEM_POST_NOT_FOUND',
        'System post not found.',
        { code: missing },
      );
    }

    await this.prisma.systemPost.deleteMany({
      where: { id: { in: posts.map((post) => post.id) } },
    });

    return {
      deleted: true,
      affected: codes.length,
      codes,
    };
  }

  async updatePostOrder(
    body: UpdateSystemPostOrderDto,
  ): Promise<SystemPostOrderMutationResult> {
    const input = normalizeUpdateSystemPostOrderInput(body);
    const codes = input.map((item) => item.code);
    const tenantId = resolveCurrentTenantId();
    const posts = (
      await this.prisma.systemPost.findMany({
        where: { tenantId, code: { in: codes } },
      })
    ).map(toSystemPostRecord);

    assertFoundPostCodes(codes, posts);

    const updated = await this.prisma.$transaction(
      input.map((item) =>
        this.prisma.systemPost.update({
          where: {
            tenantId_code: {
              tenantId,
              code: item.code,
            },
          },
          data: { order: item.order },
        }),
      ),
    );

    return {
      updatedCount: updated.length,
      items: updated.map(toSystemPostRecord).sort(compareSystemPostRecords),
    };
  }

  private async findPostByCode(code: string): Promise<PrismaSystemPost> {
    const tenantId = resolveCurrentTenantId();
    const post = await this.prisma.systemPost.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code,
        },
      },
    });

    if (!post) {
      throw systemPostNotFound(
        'SYSTEM_POST_NOT_FOUND',
        'System post not found.',
        {
          code,
          tenantId,
        },
      );
    }

    return post;
  }
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

function toSystemPostRecord(post: PrismaSystemPost): SystemPostRecord {
  return {
    id: post.id,
    code: post.code,
    name: post.name,
    order: post.order,
    description: post.description ?? undefined,
    enabled: post.enabled,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

function assertFoundPostCodes(
  expectedCodes: readonly string[],
  rows: readonly SystemPostRecord[],
): void {
  const foundCodes = new Set(rows.map((row) => row.code));
  const missingCodes = expectedCodes.filter((code) => !foundCodes.has(code));

  if (missingCodes.length > 0) {
    throw systemPostNotFound(
      'SYSTEM_POST_NOT_FOUND',
      'System post not found.',
      { codes: missingCodes },
    );
  }
}

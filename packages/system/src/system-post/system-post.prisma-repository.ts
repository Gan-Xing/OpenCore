import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type {
  CreateSystemPostDto,
  UpdateSystemPostDto,
} from './system-post.dto';
import type { SystemPostRecord } from './system-post.records';
import {
  createSystemPostPageResult,
  normalizeCreateSystemPostInput,
  normalizeSystemPostFilters,
  normalizeSystemPostPageQuery,
  normalizeUpdateSystemPostInput,
  SystemPostRepository,
  type SystemPostOptionRecord,
  type SystemPostPageQuery,
} from './system-post.repository';

type PrismaSystemPost = {
  id: string;
  code: string;
  name: string;
  order: number;
  description: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaSystemPostRepository extends SystemPostRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listPosts(
    query: SystemPostPageQuery = {},
  ): Promise<PageResult<SystemPostRecord>> {
    const filters = normalizeSystemPostFilters(query);
    const where = {
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
    return this.prisma.systemPost.findMany({
      where: { enabled: true },
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

    if (
      await this.prisma.systemPost.findUnique({ where: { code: input.code } })
    ) {
      throw new ConflictException(`System post already exists: ${input.code}`);
    }

    const post = await this.prisma.systemPost.create({ data: input });
    return toSystemPostRecord(post);
  }

  async updatePost(
    code: string,
    body: UpdateSystemPostDto,
  ): Promise<SystemPostRecord> {
    const existing = toSystemPostRecord(await this.findPostByCode(code));
    const post = await this.prisma.systemPost.update({
      where: { code },
      data: normalizeUpdateSystemPostInput(existing, body),
    });

    return toSystemPostRecord(post);
  }

  async deletePost(code: string): Promise<{ deleted: true }> {
    await this.findPostByCode(code);
    await this.prisma.systemPost.delete({ where: { code } });
    return { deleted: true };
  }

  private async findPostByCode(code: string): Promise<PrismaSystemPost> {
    const post = await this.prisma.systemPost.findUnique({ where: { code } });

    if (!post) {
      throw new NotFoundException(`System post not found: ${code}`);
    }

    return post;
  }
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

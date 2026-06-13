import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  BatchDeleteSystemPostsDto,
  CreateSystemPostDto,
  UpdateSystemPostOrderDto,
  UpdateSystemPostDto,
} from './system-post.dto';
import { seedSystemPosts, type SystemPostRecord } from './system-post.records';
import {
  compareSystemPostRecords,
  createSystemPostPageResult,
  normalizeBatchDeleteSystemPostsInput,
  normalizeCreateSystemPostInput,
  normalizeSystemPostFilters,
  normalizeSystemPostPageQuery,
  normalizeUpdateSystemPostOrderInput,
  normalizeUpdateSystemPostInput,
  SystemPostRepository,
  type SystemPostBatchMutationRecord,
  type SystemPostOrderMutationResult,
  toSystemPostOptionRecord,
  type SystemPostOptionRecord,
  type SystemPostPageQuery,
} from './system-post.repository';

@Injectable()
export class SeedSystemPostRepository extends SystemPostRepository {
  private posts = seedSystemPosts.map((post) => ({ ...post }));

  async listPosts(
    query: SystemPostPageQuery = {},
  ): Promise<PageResult<SystemPostRecord>> {
    const filters = normalizeSystemPostFilters(query);
    const filtered = this.posts
      .filter(
        (post) =>
          filters.enabled === undefined || post.enabled === filters.enabled,
      )
      .sort(compareSystemPostRecords);
    const pagination = normalizeSystemPostPageQuery(query, filtered.length);
    const rows = filtered.slice(
      pagination.skip,
      pagination.skip + pagination.take,
    );

    return createSystemPostPageResult(
      rows.map((post) => ({ ...post })),
      pagination,
    );
  }

  async listPostOptions(): Promise<readonly SystemPostOptionRecord[]> {
    return this.posts
      .filter((post) => post.enabled)
      .sort(compareSystemPostRecords)
      .map(toSystemPostOptionRecord);
  }

  async getPost(code: string): Promise<SystemPostRecord> {
    return { ...this.findPost(code) };
  }

  async createPost(body: CreateSystemPostDto): Promise<SystemPostRecord> {
    const input = normalizeCreateSystemPostInput(body);

    if (this.posts.some((post) => post.code === input.code)) {
      throw new ConflictException(`System post already exists: ${input.code}`);
    }

    const now = new Date().toISOString();
    const post: SystemPostRecord = {
      id: `post_${input.code.replace(/[^a-z0-9]+/g, '_')}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.posts = [...this.posts, post];
    return { ...post };
  }

  async updatePost(
    code: string,
    body: UpdateSystemPostDto,
  ): Promise<SystemPostRecord> {
    const post = this.findPost(code);
    Object.assign(post, {
      ...normalizeUpdateSystemPostInput(post, body),
      updatedAt: new Date().toISOString(),
    });
    return { ...post };
  }

  async deletePost(code: string): Promise<{ deleted: true }> {
    this.findPost(code);
    this.posts = this.posts.filter((post) => post.code !== code);
    return { deleted: true };
  }

  async deletePosts(
    body: BatchDeleteSystemPostsDto,
  ): Promise<SystemPostBatchMutationRecord> {
    const codes = normalizeBatchDeleteSystemPostsInput(body);
    const selected = codes.map((code) => this.findPost(code));
    const selectedCodes = new Set(selected.map((post) => post.code));

    this.posts = this.posts.filter((post) => !selectedCodes.has(post.code));

    return {
      deleted: true,
      affected: selected.length,
      codes,
    };
  }

  async updatePostOrder(
    body: UpdateSystemPostOrderDto,
  ): Promise<SystemPostOrderMutationResult> {
    const input = normalizeUpdateSystemPostOrderInput(body);
    for (const item of input) {
      this.findPost(item.code);
    }

    for (const item of input) {
      Object.assign(this.findPost(item.code), {
        order: item.order,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      updatedCount: input.length,
      items: input
        .map((item) => ({ ...this.findPost(item.code) }))
        .sort(compareSystemPostRecords),
    };
  }

  private findPost(code: string): SystemPostRecord {
    const post = this.posts.find((candidate) => candidate.code === code);

    if (!post) {
      throw new NotFoundException(`System post not found: ${code}`);
    }

    return post;
  }
}

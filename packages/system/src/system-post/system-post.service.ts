import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  CreateSystemPostDto,
  UpdateSystemPostDto,
} from './system-post.dto';
import type { SystemPostRecord } from './system-post.records';
import {
  createSystemPostExportPreview,
  SystemPostRepository,
  type SystemPostExportPreview,
  type SystemPostPageQuery,
} from './system-post.repository';

@Injectable()
export class SystemPostService {
  constructor(private readonly repository: SystemPostRepository) {}

  listPosts(
    query: SystemPostPageQuery = {},
  ): Promise<PageResult<SystemPostRecord>> {
    return this.repository.listPosts(query);
  }

  createPost(body: CreateSystemPostDto): Promise<SystemPostRecord> {
    return this.repository.createPost(body);
  }

  updatePost(
    code: string,
    body: UpdateSystemPostDto,
  ): Promise<SystemPostRecord> {
    return this.repository.updatePost(code, body);
  }

  deletePost(code: string): Promise<{ deleted: true }> {
    return this.repository.deletePost(code);
  }

  async createExportPreview(
    query: SystemPostPageQuery = {},
  ): Promise<SystemPostExportPreview> {
    return createSystemPostExportPreview(
      await this.repository.listPosts(query),
    );
  }
}

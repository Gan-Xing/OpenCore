import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  BatchKickOutSessionsDto,
  BatchKickOutSessionsResultDto,
  CleanExpiredOnlineUserSessionsQueryDto,
  CleanExpiredOnlineUserSessionsResultDto,
  KickOutSessionDto,
  OnlineUserSummaryDto,
} from './online-user.dto';
import type { OnlineUserSessionRecord } from './online-user.records';
import {
  OnlineUserRepository,
  type OnlineUserQuery,
} from './online-user.repository';

@Injectable()
export class OnlineUserService {
  constructor(private readonly repository: OnlineUserRepository) {}

  listOnlineUsers(
    query: OnlineUserQuery = {},
  ): Promise<PageResult<OnlineUserSessionRecord>> {
    return this.repository.listOnlineUsers(query);
  }

  getOnlineUser(id: string): Promise<OnlineUserSessionRecord> {
    return this.repository.getOnlineUser(id);
  }

  kickOutSession(
    id: string,
    body: KickOutSessionDto,
  ): Promise<OnlineUserSessionRecord> {
    return this.repository.kickOutSession(id, body);
  }

  kickOutSessions(
    body: BatchKickOutSessionsDto,
  ): Promise<BatchKickOutSessionsResultDto> {
    return this.repository.kickOutSessions(body);
  }

  getSummary(): Promise<OnlineUserSummaryDto> {
    return this.repository.getSummary();
  }

  cleanExpiredSessions(
    input: CleanExpiredOnlineUserSessionsQueryDto = {},
  ): Promise<CleanExpiredOnlineUserSessionsResultDto> {
    return this.repository.cleanExpiredSessions(input);
  }
}

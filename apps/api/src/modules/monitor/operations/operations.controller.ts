import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuditLoginLogService } from '@opencore/audit';
import { getRequestContext } from '@opencore/core';
import { OnlineUserService } from '@opencore/online-user';
import type { OnlineUserSessionRecord } from '@opencore/online-user';
import { SchedulerService } from '@opencore/scheduler';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  CacheClearResultDto,
  CacheKeyPageDto,
  CacheKeyQueryDto,
  BatchKickOutSessionsDto,
  BatchKickOutSessionsResultDto,
  ClearCacheDto,
  CreateJobDefinitionDto,
  CreateReportDefinitionDto,
  ExportJobDesignDto,
  JobDefinitionDto,
  JobDefinitionPageDto,
  JobQueryDto,
  JobRunLogDto,
  JobRunLogPageDto,
  JobRunQueryDto,
  KickOutSessionDto,
  OnlineUserSessionDto,
  OnlineUserSessionPageDto,
  OnlineUserQueryDto,
  OperationsSummaryDto,
  ReportDefinitionDto,
  ReportDefinitionPageDto,
  ReportQueryDto,
  TriggerJobDto,
  UpdateJobDefinitionDto,
} from './operations.dto';
import { OperationsRepository } from './operations.repository';

@ApiBearerAuth()
@Controller()
export class OperationsController {
  constructor(
    private readonly repository: OperationsRepository,
    private readonly scheduler: SchedulerService,
    private readonly onlineUsers: OnlineUserService,
    private readonly loginLogs: AuditLoginLogService,
  ) {}

  @Get('monitor/operations/summary')
  @ApiTags('Operations')
  @RequirePermission('monitor:job:read')
  @ApiOkResponse({ type: OperationsSummaryDto })
  async getSummary(): Promise<OperationsSummaryDto> {
    const [scheduler, onlineUsers] = await Promise.all([
      this.scheduler.getSummary(),
      this.onlineUsers.getSummary(),
    ]);

    return this.repository.getSummary(scheduler, onlineUsers);
  }

  @Get('monitor/jobs')
  @ApiTags('Monitor Jobs')
  @RequirePermission('monitor:job:read')
  @ApiOkResponse({ type: JobDefinitionPageDto })
  listJobs(@Query() query: JobQueryDto): Promise<JobDefinitionPageDto> {
    return this.scheduler.listJobs(query);
  }

  @Get('monitor/jobs/:code')
  @ApiTags('Monitor Jobs')
  @RequirePermission('monitor:job:read')
  @ApiOkResponse({ type: JobDefinitionDto })
  getJob(@Param('code') code: string): Promise<JobDefinitionDto> {
    return this.scheduler.getJob(code);
  }

  @Post('monitor/jobs')
  @ApiTags('Monitor Jobs')
  @RequirePermission('monitor:job:create')
  @ApiOkResponse({ type: JobDefinitionDto })
  createJob(@Body() body: CreateJobDefinitionDto): Promise<JobDefinitionDto> {
    return this.scheduler.createJob(body);
  }

  @Patch('monitor/jobs/:code')
  @ApiTags('Monitor Jobs')
  @RequirePermission('monitor:job:update')
  @ApiOkResponse({ type: JobDefinitionDto })
  updateJob(
    @Param('code') code: string,
    @Body() body: UpdateJobDefinitionDto,
  ): Promise<JobDefinitionDto> {
    return this.scheduler.updateJob(code, body);
  }

  @Patch('monitor/jobs/:code/enable')
  @ApiTags('Monitor Jobs')
  @RequirePermission('monitor:job:update')
  @ApiOkResponse({ type: JobDefinitionDto })
  enableJob(@Param('code') code: string): Promise<JobDefinitionDto> {
    return this.scheduler.enableJob(code);
  }

  @Patch('monitor/jobs/:code/disable')
  @ApiTags('Monitor Jobs')
  @RequirePermission('monitor:job:update')
  @ApiOkResponse({ type: JobDefinitionDto })
  disableJob(@Param('code') code: string): Promise<JobDefinitionDto> {
    return this.scheduler.disableJob(code);
  }

  @Post('monitor/jobs/:code/trigger')
  @ApiTags('Monitor Jobs')
  @RequirePermission('monitor:job:manage')
  @ApiOkResponse({ type: JobRunLogDto })
  triggerJob(
    @Param('code') code: string,
    @Body() body: TriggerJobDto,
  ): Promise<JobRunLogDto> {
    return this.scheduler.triggerJob(code, body);
  }

  @Get('monitor/jobs/:code/runs')
  @ApiTags('Monitor Jobs')
  @RequirePermission('monitor:job:read')
  @ApiOkResponse({ type: JobRunLogPageDto })
  listJobRuns(
    @Param('code') code: string,
    @Query() query: JobRunQueryDto,
  ): Promise<JobRunLogPageDto> {
    return this.scheduler.listJobRuns(code, query);
  }

  @Get('monitor/jobs/:code/runs/:id')
  @ApiTags('Monitor Jobs')
  @RequirePermission('monitor:job:read')
  @ApiOkResponse({ type: JobRunLogDto })
  getJobRun(
    @Param('code') code: string,
    @Param('id') id: string,
  ): Promise<JobRunLogDto> {
    return this.scheduler.getJobRun(code, id);
  }

  @Get('monitor/cache')
  @ApiTags('Monitor Cache')
  @RequirePermission('monitor:cache:read')
  @ApiOkResponse({ type: CacheKeyPageDto })
  listCacheKeys(@Query() query: CacheKeyQueryDto): Promise<CacheKeyPageDto> {
    return this.repository.listCacheKeys(query);
  }

  @Post('monitor/cache/clear')
  @ApiTags('Monitor Cache')
  @RequirePermission('monitor:cache:manage')
  @ApiOkResponse({ type: CacheClearResultDto })
  clearCache(@Body() body: ClearCacheDto): Promise<CacheClearResultDto> {
    return this.repository.clearCache(body);
  }

  @Get('monitor/online-users')
  @ApiTags('Monitor Online Users')
  @RequirePermission('monitor:online-user:read')
  @ApiOkResponse({ type: OnlineUserSessionPageDto })
  listOnlineUsers(
    @Query() query: OnlineUserQueryDto,
  ): Promise<OnlineUserSessionPageDto> {
    return this.onlineUsers.listOnlineUsers(query);
  }

  @Post('monitor/online-users/kick-out')
  @ApiTags('Monitor Online Users')
  @RequirePermission('monitor:online-user:manage')
  @ApiOkResponse({ type: BatchKickOutSessionsResultDto })
  async kickOutSessions(
    @Body() body: BatchKickOutSessionsDto,
  ): Promise<BatchKickOutSessionsResultDto> {
    const result = await this.onlineUsers.kickOutSessions(body);

    await Promise.all(
      result.items.map((session) =>
        this.recordForceLogoutLoginLog(session, body),
      ),
    );

    return result;
  }

  @Get('monitor/online-users/:id')
  @ApiTags('Monitor Online Users')
  @RequirePermission('monitor:online-user:read')
  @ApiOkResponse({ type: OnlineUserSessionDto })
  getOnlineUser(@Param('id') id: string): Promise<OnlineUserSessionDto> {
    return this.onlineUsers.getOnlineUser(id);
  }

  @Post('monitor/online-users/:id/kick-out')
  @ApiTags('Monitor Online Users')
  @RequirePermission('monitor:online-user:manage')
  @ApiOkResponse({ type: OnlineUserSessionDto })
  async kickOutSession(
    @Param('id') id: string,
    @Body() body: KickOutSessionDto,
  ): Promise<OnlineUserSessionDto> {
    const session = await this.onlineUsers.kickOutSession(id, body);

    await this.recordForceLogoutLoginLog(session, body);

    return session;
  }

  @Get('optional/reports')
  @ApiTags('Optional Reports')
  @RequirePermission('optional:report:read')
  @ApiOkResponse({ type: ReportDefinitionPageDto })
  listReports(
    @Query() query: ReportQueryDto,
  ): Promise<ReportDefinitionPageDto> {
    return this.repository.listReports(query);
  }

  @Get('optional/reports/:code')
  @ApiTags('Optional Reports')
  @RequirePermission('optional:report:read')
  @ApiOkResponse({ type: ReportDefinitionDto })
  getReport(@Param('code') code: string): Promise<ReportDefinitionDto> {
    return this.repository.getReport(code);
  }

  @Post('optional/reports')
  @ApiTags('Optional Reports')
  @RequirePermission('optional:report:create')
  @ApiOkResponse({ type: ReportDefinitionDto })
  createReport(
    @Body() body: CreateReportDefinitionDto,
  ): Promise<ReportDefinitionDto> {
    return this.repository.createReport(body);
  }

  @Get('optional/export-jobs/design')
  @ApiTags('Optional Export Jobs')
  @RequirePermission('optional:export-job:read')
  @ApiOkResponse({ type: ExportJobDesignDto })
  getExportJobDesign(): ExportJobDesignDto {
    return this.repository.getExportJobDesign();
  }

  private async recordForceLogoutLoginLog(
    session: OnlineUserSessionRecord,
    body: KickOutSessionDto,
  ): Promise<void> {
    await this.loginLogs.recordLoginAttempt({
      username: session.username,
      logType: 'logout.force',
      result: 'success',
      success: true,
      ip: session.ip,
      userAgent: session.userAgent,
      requestId:
        getRequestContext()?.requestId ?? `online-user.kick-out:${session.id}`,
      actorUsername: body.actor,
      reason: body.reason,
    });
  }
}

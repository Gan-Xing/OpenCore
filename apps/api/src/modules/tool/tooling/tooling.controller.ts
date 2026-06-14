import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  CreateExportPreviewDto,
  CurrentPageExportProtocolDto,
  ExportPlanDto,
  OpenApiDriftStatusDto,
  OpenForgeApplyDryRunDto,
  OpenForgeApplyDryRunRequestDto,
  OpenForgeDiffDto,
  OpenForgeDoctorDto,
  OpenForgeManifestDetailDto,
  OpenForgeManifestListDto,
  OpenForgePlanDto,
  OpenForgePreflightDto,
  OpenForgeRollbackDryRunDto,
  OpenForgeRollbackDryRunRequestDto,
  OpenForgeSchemaRequestDto,
  OpenForgeStatusDto,
} from './tooling.dto';
import { ToolingRepository } from './tooling.repository';

@ApiBearerAuth()
@Controller('tools')
export class ToolingController {
  constructor(private readonly repository: ToolingRepository) {}

  @Get('openapi/drift')
  @ApiTags('Tool OpenAPI')
  @RequirePermission('tool:openapi:read')
  @ApiOkResponse({ type: OpenApiDriftStatusDto })
  getOpenApiDriftStatus(): OpenApiDriftStatusDto {
    return this.repository.getOpenApiDriftStatus();
  }

  @Get('export/protocol')
  @ApiTags('Tool Export')
  @RequirePermission('tool:export:read')
  @ApiOkResponse({ type: CurrentPageExportProtocolDto })
  getExportProtocol(): CurrentPageExportProtocolDto {
    return this.repository.getExportProtocol();
  }

  @Post('export/preview')
  @ApiTags('Tool Export')
  @RequirePermission('tool:export:export')
  @ApiOkResponse({ type: ExportPlanDto })
  createExportPreview(@Body() body: CreateExportPreviewDto): ExportPlanDto {
    return this.repository.createExportPlan(body);
  }

  @Get('openforge/status')
  @ApiTags('Tool OpenForge')
  @RequirePermission('tool:openforge:read')
  @ApiOkResponse({ type: OpenForgeStatusDto })
  getOpenForgeStatus(): OpenForgeStatusDto {
    return this.repository.getOpenForgeStatus();
  }

  @Get('openforge/doctor')
  @ApiTags('Tool OpenForge')
  @RequirePermission('tool:openforge:read')
  @ApiOkResponse({ type: OpenForgeDoctorDto })
  getOpenForgeDoctor(): OpenForgeDoctorDto {
    return this.repository.getOpenForgeDoctor();
  }

  @Post('openforge/plan')
  @ApiTags('Tool OpenForge')
  @RequirePermission('tool:openforge:read')
  @ApiOkResponse({ type: OpenForgePlanDto })
  createOpenForgePlan(
    @Body() body: OpenForgeSchemaRequestDto,
  ): OpenForgePlanDto {
    return this.repository.createOpenForgePlan(body);
  }

  @Post('openforge/diff')
  @ApiTags('Tool OpenForge')
  @RequirePermission('tool:openforge:read')
  @ApiOkResponse({ type: OpenForgeDiffDto })
  createOpenForgeDiff(
    @Body() body: OpenForgeSchemaRequestDto,
  ): OpenForgeDiffDto {
    return this.repository.createOpenForgeDiff(body);
  }

  @Post('openforge/check')
  @ApiTags('Tool OpenForge')
  @RequirePermission('tool:openforge:read')
  @ApiOkResponse({ type: OpenForgePreflightDto })
  createOpenForgePreflight(
    @Body() body: OpenForgeSchemaRequestDto,
  ): OpenForgePreflightDto {
    return this.repository.createOpenForgePreflight(body);
  }

  @Post('openforge/apply/dry-run')
  @ApiTags('Tool OpenForge')
  @RequirePermission('tool:openforge:manage')
  @ApiOkResponse({ type: OpenForgeApplyDryRunDto })
  createOpenForgeApplyDryRun(
    @Body() body: OpenForgeApplyDryRunRequestDto,
  ): OpenForgeApplyDryRunDto {
    return this.repository.createOpenForgeApplyDryRun(body);
  }

  @Get('openforge/manifests')
  @ApiTags('Tool OpenForge')
  @RequirePermission('tool:openforge:read')
  @ApiOkResponse({ type: OpenForgeManifestListDto })
  listOpenForgeManifests(): OpenForgeManifestListDto {
    return this.repository.listOpenForgeManifests();
  }

  @Get('openforge/manifests/:manifestId')
  @ApiTags('Tool OpenForge')
  @RequirePermission('tool:openforge:read')
  @ApiOkResponse({ type: OpenForgeManifestDetailDto })
  getOpenForgeManifest(
    @Param('manifestId') manifestId: string,
  ): OpenForgeManifestDetailDto {
    return this.repository.getOpenForgeManifest(manifestId);
  }

  @Post('openforge/rollback/dry-run')
  @ApiTags('Tool OpenForge')
  @RequirePermission('tool:openforge:manage')
  @ApiOkResponse({ type: OpenForgeRollbackDryRunDto })
  createOpenForgeRollbackDryRun(
    @Body() body: OpenForgeRollbackDryRunRequestDto,
  ): OpenForgeRollbackDryRunDto {
    return this.repository.createOpenForgeRollbackDryRun(body);
  }
}

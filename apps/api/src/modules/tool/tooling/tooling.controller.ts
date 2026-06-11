import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  CreateExportPreviewDto,
  CurrentPageExportProtocolDto,
  ExportPlanDto,
  OpenApiDriftStatusDto,
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
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { AuditOperation } from '@opencore/audit';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  ChangeBusinessOpportunityStageDto,
  ConvertBusinessLeadDto,
  ConvertBusinessLeadResultDto,
  CreateBusinessLeadDto,
  CreateBusinessOpportunityDto,
  BusinessExportPreviewDto,
  BusinessExportQueryDto,
  BusinessLeadDto,
  BusinessLeadPageDto,
  BusinessLeadQueryDto,
  BusinessOpportunityDto,
  BusinessOpportunityPageDto,
  BusinessOpportunityQueryDto,
  BusinessSummaryDto,
  TransferBusinessOwnerDto,
  UpdateBusinessLeadDto,
  UpdateBusinessOpportunityDto,
} from '../core/business.dto';
import { BusinessRepository } from '../core/business.repository';

class SalesDeleteResultDto {
  @ApiProperty()
  deleted!: true;
}

@ApiBearerAuth()
@ApiTags('Business Sales')
@Controller('business/sales')
export class SalesController {
  constructor(private readonly repository: BusinessRepository) {}

  @Get('summary')
  @RequirePermission('business:sales:read')
  @ApiOkResponse({ type: BusinessSummaryDto })
  getSummary(): Promise<BusinessSummaryDto> {
    return this.repository.getSummary();
  }

  @Get('export')
  @RequirePermission('business:sales:export')
  @ApiOkResponse({ type: BusinessExportPreviewDto })
  exportSales(
    @Query() query: BusinessExportQueryDto,
  ): Promise<BusinessExportPreviewDto> {
    return this.repository.exportBusiness(query);
  }

  @Get('leads')
  @RequirePermission('business:sales:read')
  @ApiOkResponse({ type: BusinessLeadPageDto })
  listLeads(
    @Query() query: BusinessLeadQueryDto,
  ): Promise<BusinessLeadPageDto> {
    return this.repository.listLeads(query);
  }

  @Get('leads/:id')
  @RequirePermission('business:sales:read')
  @ApiOkResponse({ type: BusinessLeadDto })
  getLead(@Param('id') id: string): Promise<BusinessLeadDto> {
    return this.repository.getLead(id);
  }

  @Post('leads')
  @RequirePermission('business:sales:create')
  @AuditOperation({ action: 'create-lead', resource: 'business.sales' })
  @ApiOkResponse({ type: BusinessLeadDto })
  createLead(@Body() body: CreateBusinessLeadDto): Promise<BusinessLeadDto> {
    return this.repository.createLead(body);
  }

  @Patch('leads/:id')
  @RequirePermission('business:sales:update')
  @AuditOperation({
    action: 'update-lead',
    resource: 'business.sales',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessLeadDto })
  updateLead(
    @Param('id') id: string,
    @Body() body: UpdateBusinessLeadDto,
  ): Promise<BusinessLeadDto> {
    return this.repository.updateLead(id, body);
  }

  @Patch('leads/:id/convert')
  @RequirePermission('business:sales:update')
  @AuditOperation({
    action: 'convert-lead',
    resource: 'business.sales',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: ConvertBusinessLeadResultDto })
  convertLead(
    @Param('id') id: string,
    @Body() body: ConvertBusinessLeadDto,
  ): Promise<ConvertBusinessLeadResultDto> {
    return this.repository.convertLead(id, body);
  }

  @Patch('leads/:id/transfer')
  @RequirePermission('business:sales:assign')
  @AuditOperation({
    action: 'transfer-lead',
    resource: 'business.sales',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessLeadDto })
  transferLeadOwner(
    @Param('id') id: string,
    @Body() body: TransferBusinessOwnerDto,
  ): Promise<BusinessLeadDto> {
    return this.repository.transferLeadOwner(id, body);
  }

  @Delete('leads/:id')
  @RequirePermission('business:sales:delete')
  @AuditOperation({
    action: 'archive-lead',
    resource: 'business.sales',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: SalesDeleteResultDto })
  archiveLead(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveLead(id);
  }

  @Get('opportunities')
  @RequirePermission('business:sales:read')
  @ApiOkResponse({ type: BusinessOpportunityPageDto })
  listOpportunities(
    @Query() query: BusinessOpportunityQueryDto,
  ): Promise<BusinessOpportunityPageDto> {
    return this.repository.listOpportunities(query);
  }

  @Get('opportunities/:id')
  @RequirePermission('business:sales:read')
  @ApiOkResponse({ type: BusinessOpportunityDto })
  getOpportunity(@Param('id') id: string): Promise<BusinessOpportunityDto> {
    return this.repository.getOpportunity(id);
  }

  @Post('opportunities')
  @RequirePermission('business:sales:create')
  @AuditOperation({ action: 'create-opportunity', resource: 'business.sales' })
  @ApiOkResponse({ type: BusinessOpportunityDto })
  createOpportunity(
    @Body() body: CreateBusinessOpportunityDto,
  ): Promise<BusinessOpportunityDto> {
    return this.repository.createOpportunity(body);
  }

  @Patch('opportunities/:id')
  @RequirePermission('business:sales:update')
  @AuditOperation({
    action: 'update-opportunity',
    resource: 'business.sales',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessOpportunityDto })
  updateOpportunity(
    @Param('id') id: string,
    @Body() body: UpdateBusinessOpportunityDto,
  ): Promise<BusinessOpportunityDto> {
    return this.repository.updateOpportunity(id, body);
  }

  @Patch('opportunities/:id/stage')
  @RequirePermission('business:sales:update')
  @AuditOperation({
    action: 'change-opportunity-stage',
    resource: 'business.sales',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessOpportunityDto })
  changeOpportunityStage(
    @Param('id') id: string,
    @Body() body: ChangeBusinessOpportunityStageDto,
  ): Promise<BusinessOpportunityDto> {
    return this.repository.changeOpportunityStage(id, body);
  }

  @Patch('opportunities/:id/transfer')
  @RequirePermission('business:sales:assign')
  @AuditOperation({
    action: 'transfer-opportunity',
    resource: 'business.sales',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessOpportunityDto })
  transferOpportunityOwner(
    @Param('id') id: string,
    @Body() body: TransferBusinessOwnerDto,
  ): Promise<BusinessOpportunityDto> {
    return this.repository.transferOpportunityOwner(id, body);
  }

  @Delete('opportunities/:id')
  @RequirePermission('business:sales:delete')
  @AuditOperation({
    action: 'archive-opportunity',
    resource: 'business.sales',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: SalesDeleteResultDto })
  archiveOpportunity(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveOpportunity(id);
  }
}

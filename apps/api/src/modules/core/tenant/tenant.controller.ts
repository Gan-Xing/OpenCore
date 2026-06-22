import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../rbac/permissions.decorator';
import { TenantFoundationSummaryDto } from './tenant.dto';
import { TenantFoundationService } from './tenant.service';

@ApiBearerAuth()
@ApiTags('Core Tenancy')
@Controller('core/tenancy')
export class TenantFoundationController {
  constructor(private readonly tenancy: TenantFoundationService) {}

  @Get('foundation')
  @RequirePermission('platform:tenant:read')
  @ApiOkResponse({ type: TenantFoundationSummaryDto })
  getFoundationSummary(): Promise<TenantFoundationSummaryDto> {
    return this.tenancy.getFoundationSummary();
  }
}

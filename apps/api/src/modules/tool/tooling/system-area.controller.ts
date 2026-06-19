import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../core/rbac/permissions.decorator';
import {
  AreaDatasetActivationResultDto,
  AreaDatasetImportRequestDto,
  AreaDatasetImportResultDto,
  AreaDatasetSummaryDto,
  AreaDatasetVersionListDto,
  AreaIpLookupDto,
  AreaIpLookupQueryDto,
  AreaIpLookupRequestDto,
  AreaRegionDto,
  AreaRegionFormatDto,
  AreaRegionFormatQueryDto,
  AreaRegionListDto,
  AreaRegionQueryDto,
  AreaRegionTreeDto,
  AreaTreeQueryDto,
} from './tooling.dto';
import { ToolingRepository } from './tooling.repository';

@ApiBearerAuth()
@ApiTags('System Area')
@Controller('system/area')
export class SystemAreaController {
  constructor(private readonly repository: ToolingRepository) {}

  @Get('dataset')
  @RequirePermission('system:area:read')
  @ApiOkResponse({ type: AreaDatasetSummaryDto })
  getAreaDatasetStatus(): Promise<AreaDatasetSummaryDto> {
    return this.repository.getAreaDatasetStatus();
  }

  @Get('dataset/versions')
  @RequirePermission('system:area:read')
  @ApiOkResponse({ type: AreaDatasetVersionListDto })
  listAreaDatasetVersions(): Promise<AreaDatasetVersionListDto> {
    return this.repository.listAreaDatasetVersions();
  }

  @Post('dataset/versions/:version/activate')
  @RequirePermission('system:area:manage')
  @ApiOkResponse({ type: AreaDatasetActivationResultDto })
  activateAreaDatasetVersion(
    @Param('version') version: string,
  ): Promise<AreaDatasetActivationResultDto> {
    return this.repository.activateAreaDatasetVersion(version);
  }

  @Get('tree')
  @RequirePermission('system:area:read')
  @ApiOkResponse({ type: AreaRegionTreeDto })
  listAreaTree(@Query() query: AreaTreeQueryDto): Promise<AreaRegionTreeDto> {
    return this.repository.listAreaTree(query);
  }

  @Get('children')
  @RequirePermission('system:area:read')
  @ApiOkResponse({ type: AreaRegionListDto })
  listAreaChildren(
    @Query() query: AreaRegionQueryDto,
  ): Promise<AreaRegionListDto> {
    return this.repository.listAreaRegions({
      ...query,
      query: undefined,
    });
  }

  @Get('regions')
  @RequirePermission('system:area:read')
  @ApiOkResponse({ type: AreaRegionListDto })
  listAreaRegions(
    @Query() query: AreaRegionQueryDto,
  ): Promise<AreaRegionListDto> {
    return this.repository.listAreaRegions(query);
  }

  @Get('regions/:code')
  @RequirePermission('system:area:read')
  @ApiOkResponse({ type: AreaRegionDto })
  getAreaRegion(@Param('code') code: string): Promise<AreaRegionDto> {
    return this.repository.getAreaRegion(code);
  }

  @Get('format')
  @RequirePermission('system:area:read')
  @ApiOkResponse({ type: AreaRegionFormatDto })
  formatAreaRegion(
    @Query() query: AreaRegionFormatQueryDto,
  ): Promise<AreaRegionFormatDto> {
    return this.repository.formatAreaRegion(query);
  }

  @Get('get-by-ip')
  @RequirePermission('system:area:read')
  @ApiOkResponse({ type: AreaIpLookupDto })
  getAreaByIp(@Query() query: AreaIpLookupQueryDto): Promise<AreaIpLookupDto> {
    return this.repository.lookupAreaIp(query);
  }

  @Post('ip/lookup')
  @RequirePermission('system:area:read')
  @ApiOkResponse({ type: AreaIpLookupDto })
  lookupAreaIp(@Body() body: AreaIpLookupRequestDto): Promise<AreaIpLookupDto> {
    return this.repository.lookupAreaIp(body);
  }

  @Post('import')
  @RequirePermission('system:area:import')
  @ApiOkResponse({ type: AreaDatasetImportResultDto })
  importAreaDataset(
    @Body() body: AreaDatasetImportRequestDto,
  ): Promise<AreaDatasetImportResultDto> {
    return this.repository.importAreaDataset(body);
  }
}

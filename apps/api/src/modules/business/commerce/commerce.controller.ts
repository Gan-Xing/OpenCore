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
  BusinessCommerceActionDto,
  BusinessCommerceExportPreviewDto,
  BusinessCommerceExportQueryDto,
  BusinessCommerceSummaryDto,
  BusinessContractDto,
  BusinessContractPageDto,
  BusinessContractQueryDto,
  BusinessProductDto,
  BusinessProductPageDto,
  BusinessProductQueryDto,
  BusinessQuoteDto,
  BusinessQuotePageDto,
  BusinessQuoteQueryDto,
  BusinessReceivableDto,
  BusinessReceivablePageDto,
  BusinessReceivableQueryDto,
  CreateBusinessContractDto,
  CreateBusinessProductDto,
  CreateBusinessQuoteDto,
  CreateBusinessReceivableDto,
  RecordBusinessReceivablePaymentDto,
  UpdateBusinessContractDto,
  UpdateBusinessProductDto,
  UpdateBusinessQuoteDto,
  UpdateBusinessReceivableDto,
} from './commerce.dto';
import { BusinessCommerceRepository } from './commerce.repository';

class BusinessCommerceDeleteResultDto {
  @ApiProperty()
  deleted!: true;
}

@ApiBearerAuth()
@ApiTags('Business Commerce')
@Controller('business/commerce')
export class BusinessCommerceController {
  constructor(private readonly repository: BusinessCommerceRepository) {}

  @Get('summary')
  @RequirePermission('business:commerce:read')
  @ApiOkResponse({ type: BusinessCommerceSummaryDto })
  getSummary(): Promise<BusinessCommerceSummaryDto> {
    return this.repository.getSummary();
  }

  @Get('export')
  @RequirePermission('business:commerce:export')
  @ApiOkResponse({ type: BusinessCommerceExportPreviewDto })
  exportCommerce(
    @Query() query: BusinessCommerceExportQueryDto,
  ): Promise<BusinessCommerceExportPreviewDto> {
    return this.repository.exportCommerce(query);
  }

  @Get('products')
  @RequirePermission('business:commerce:read')
  @ApiOkResponse({ type: BusinessProductPageDto })
  listProducts(
    @Query() query: BusinessProductQueryDto,
  ): Promise<BusinessProductPageDto> {
    return this.repository.listProducts(query);
  }

  @Get('products/:id')
  @RequirePermission('business:commerce:read')
  @ApiOkResponse({ type: BusinessProductDto })
  getProduct(@Param('id') id: string): Promise<BusinessProductDto> {
    return this.repository.getProduct(id);
  }

  @Post('products')
  @RequirePermission('business:commerce:create')
  @AuditOperation({ action: 'create-product', resource: 'business.commerce' })
  @ApiOkResponse({ type: BusinessProductDto })
  createProduct(
    @Body() body: CreateBusinessProductDto,
  ): Promise<BusinessProductDto> {
    return this.repository.createProduct(body);
  }

  @Patch('products/:id')
  @RequirePermission('business:commerce:update')
  @AuditOperation({
    action: 'update-product',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessProductDto })
  updateProduct(
    @Param('id') id: string,
    @Body() body: UpdateBusinessProductDto,
  ): Promise<BusinessProductDto> {
    return this.repository.updateProduct(id, body);
  }

  @Delete('products/:id')
  @RequirePermission('business:commerce:delete')
  @AuditOperation({
    action: 'archive-product',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessCommerceDeleteResultDto })
  archiveProduct(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveProduct(id);
  }

  @Get('quotes')
  @RequirePermission('business:commerce:read')
  @ApiOkResponse({ type: BusinessQuotePageDto })
  listQuotes(
    @Query() query: BusinessQuoteQueryDto,
  ): Promise<BusinessQuotePageDto> {
    return this.repository.listQuotes(query);
  }

  @Get('quotes/:id')
  @RequirePermission('business:commerce:read')
  @ApiOkResponse({ type: BusinessQuoteDto })
  getQuote(@Param('id') id: string): Promise<BusinessQuoteDto> {
    return this.repository.getQuote(id);
  }

  @Post('quotes')
  @RequirePermission('business:commerce:create')
  @AuditOperation({ action: 'create-quote', resource: 'business.commerce' })
  @ApiOkResponse({ type: BusinessQuoteDto })
  createQuote(@Body() body: CreateBusinessQuoteDto): Promise<BusinessQuoteDto> {
    return this.repository.createQuote(body);
  }

  @Patch('quotes/:id')
  @RequirePermission('business:commerce:update')
  @AuditOperation({
    action: 'update-quote',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessQuoteDto })
  updateQuote(
    @Param('id') id: string,
    @Body() body: UpdateBusinessQuoteDto,
  ): Promise<BusinessQuoteDto> {
    return this.repository.updateQuote(id, body);
  }

  @Patch('quotes/:id/submit')
  @RequirePermission('business:commerce:update')
  @AuditOperation({
    action: 'submit-quote',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessQuoteDto })
  submitQuote(
    @Param('id') id: string,
    @Body() body: BusinessCommerceActionDto,
  ): Promise<BusinessQuoteDto> {
    return this.repository.submitQuote(id, body);
  }

  @Patch('quotes/:id/accept')
  @RequirePermission('business:commerce:update')
  @AuditOperation({
    action: 'accept-quote',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessQuoteDto })
  acceptQuote(
    @Param('id') id: string,
    @Body() body: BusinessCommerceActionDto,
  ): Promise<BusinessQuoteDto> {
    return this.repository.acceptQuote(id, body);
  }

  @Delete('quotes/:id')
  @RequirePermission('business:commerce:delete')
  @AuditOperation({
    action: 'archive-quote',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessCommerceDeleteResultDto })
  archiveQuote(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveQuote(id);
  }

  @Get('contracts')
  @RequirePermission('business:commerce:read')
  @ApiOkResponse({ type: BusinessContractPageDto })
  listContracts(
    @Query() query: BusinessContractQueryDto,
  ): Promise<BusinessContractPageDto> {
    return this.repository.listContracts(query);
  }

  @Get('contracts/:id')
  @RequirePermission('business:commerce:read')
  @ApiOkResponse({ type: BusinessContractDto })
  getContract(@Param('id') id: string): Promise<BusinessContractDto> {
    return this.repository.getContract(id);
  }

  @Post('contracts')
  @RequirePermission('business:commerce:create')
  @AuditOperation({ action: 'create-contract', resource: 'business.commerce' })
  @ApiOkResponse({ type: BusinessContractDto })
  createContract(
    @Body() body: CreateBusinessContractDto,
  ): Promise<BusinessContractDto> {
    return this.repository.createContract(body);
  }

  @Patch('contracts/:id')
  @RequirePermission('business:commerce:update')
  @AuditOperation({
    action: 'update-contract',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessContractDto })
  updateContract(
    @Param('id') id: string,
    @Body() body: UpdateBusinessContractDto,
  ): Promise<BusinessContractDto> {
    return this.repository.updateContract(id, body);
  }

  @Patch('contracts/:id/activate')
  @RequirePermission('business:commerce:update')
  @AuditOperation({
    action: 'activate-contract',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessContractDto })
  activateContract(
    @Param('id') id: string,
    @Body() body: BusinessCommerceActionDto,
  ): Promise<BusinessContractDto> {
    return this.repository.activateContract(id, body);
  }

  @Patch('contracts/:id/complete')
  @RequirePermission('business:commerce:update')
  @AuditOperation({
    action: 'complete-contract',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessContractDto })
  completeContract(
    @Param('id') id: string,
    @Body() body: BusinessCommerceActionDto,
  ): Promise<BusinessContractDto> {
    return this.repository.completeContract(id, body);
  }

  @Delete('contracts/:id')
  @RequirePermission('business:commerce:delete')
  @AuditOperation({
    action: 'archive-contract',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessCommerceDeleteResultDto })
  archiveContract(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.archiveContract(id);
  }

  @Get('receivables')
  @RequirePermission('business:commerce:read')
  @ApiOkResponse({ type: BusinessReceivablePageDto })
  listReceivables(
    @Query() query: BusinessReceivableQueryDto,
  ): Promise<BusinessReceivablePageDto> {
    return this.repository.listReceivables(query);
  }

  @Get('receivables/:id')
  @RequirePermission('business:commerce:read')
  @ApiOkResponse({ type: BusinessReceivableDto })
  getReceivable(@Param('id') id: string): Promise<BusinessReceivableDto> {
    return this.repository.getReceivable(id);
  }

  @Post('receivables')
  @RequirePermission('business:commerce:create')
  @AuditOperation({
    action: 'create-receivable',
    resource: 'business.commerce',
  })
  @ApiOkResponse({ type: BusinessReceivableDto })
  createReceivable(
    @Body() body: CreateBusinessReceivableDto,
  ): Promise<BusinessReceivableDto> {
    return this.repository.createReceivable(body);
  }

  @Patch('receivables/:id')
  @RequirePermission('business:commerce:update')
  @AuditOperation({
    action: 'update-receivable',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessReceivableDto })
  updateReceivable(
    @Param('id') id: string,
    @Body() body: UpdateBusinessReceivableDto,
  ): Promise<BusinessReceivableDto> {
    return this.repository.updateReceivable(id, body);
  }

  @Patch('receivables/:id/pay')
  @RequirePermission('business:commerce:update')
  @AuditOperation({
    action: 'record-receivable-payment',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessReceivableDto })
  recordReceivablePayment(
    @Param('id') id: string,
    @Body() body: RecordBusinessReceivablePaymentDto,
  ): Promise<BusinessReceivableDto> {
    return this.repository.recordReceivablePayment(id, body);
  }

  @Delete('receivables/:id')
  @RequirePermission('business:commerce:delete')
  @AuditOperation({
    action: 'cancel-receivable',
    resource: 'business.commerce',
    resourceIdField: 'id',
  })
  @ApiOkResponse({ type: BusinessCommerceDeleteResultDto })
  cancelReceivable(@Param('id') id: string): Promise<{ deleted: true }> {
    return this.repository.cancelReceivable(id);
  }
}

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import type {
  AssignBusinessPoolEntryDto,
  BusinessAssignmentEventPageDto,
  BusinessAssignmentEventQueryDto,
  BusinessDuplicateGroupPageDto,
  BusinessLifecycleCustomerPageDto,
  BusinessLifecycleCustomerQueryDto,
  BusinessLifecycleEventPageDto,
  BusinessLifecycleEventQueryDto,
  BusinessLifecycleExportPreviewDto,
  BusinessLifecycleExportQueryDto,
  BusinessLifecycleSummaryDto,
  BusinessLifecycleTimelinePageDto,
  BusinessPoolEntryDto,
  BusinessPoolEntryPageDto,
  BusinessPoolEntryQueryDto,
  ChangeBusinessLifecycleStageDto,
  ClaimBusinessPoolEntryDto,
  EnterBusinessPoolDto,
  RecycleBusinessPoolEntryDto,
} from './lifecycle.dto';

export abstract class BusinessLifecycleRepository {
  abstract getSummary(): Promise<BusinessLifecycleSummaryDto>;
  abstract exportLifecycle(
    query: BusinessLifecycleExportQueryDto,
  ): Promise<BusinessLifecycleExportPreviewDto>;

  abstract listPoolEntries(
    query?: BusinessPoolEntryQueryDto,
  ): Promise<BusinessPoolEntryPageDto>;
  abstract enterPool(body: EnterBusinessPoolDto): Promise<BusinessPoolEntryDto>;
  abstract claimPoolEntry(
    id: string,
    body: ClaimBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto>;
  abstract assignPoolEntry(
    id: string,
    body: AssignBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto>;
  abstract transferPoolEntry(
    id: string,
    body: AssignBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto>;
  abstract recyclePoolEntry(
    id: string,
    body: RecycleBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto>;

  abstract listCustomers(
    query?: BusinessLifecycleCustomerQueryDto,
  ): Promise<BusinessLifecycleCustomerPageDto>;
  abstract changeCustomerStage(
    id: string,
    body: ChangeBusinessLifecycleStageDto,
  ): Promise<BusinessLifecycleCustomerPageDto['items'][number]>;
  abstract listCustomerTimeline(
    customerId: string,
    query?: BusinessLifecycleEventQueryDto,
  ): Promise<BusinessLifecycleTimelinePageDto>;

  abstract listAssignmentEvents(
    query?: BusinessAssignmentEventQueryDto,
  ): Promise<BusinessAssignmentEventPageDto>;
  abstract listLifecycleEvents(
    query?: BusinessLifecycleEventQueryDto,
  ): Promise<BusinessLifecycleEventPageDto>;
  abstract listDuplicateGroups(
    query?: BusinessPoolEntryQueryDto,
  ): Promise<BusinessDuplicateGroupPageDto>;
}

export function lifecycleBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, details, message }),
  );
}

export function lifecycleNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, details, message }));
}

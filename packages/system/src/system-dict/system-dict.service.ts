import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  BatchDeleteDictItemsDto,
  BatchDeleteDictTypesDto,
  BatchUpdateDictItemStatusDto,
  BatchUpdateDictStatusDto,
  CreateDictItemDto,
  CreateDictTypeDto,
  DictDataOptionQueryDto,
  ImportDictsDto,
  TranslateDictValuesDto,
  UpdateDictItemDto,
  UpdateDictTypeDto,
} from './system-dict.dto';
import type {
  DictDataOptionRecord,
  DictItemRecord,
  DictTypeRecord,
} from './system-dict.records';
import {
  createSystemDictExportPreview,
  createSystemDictImportTemplate,
  createSystemDictItemsExportPreview,
  normalizeDictTranslationEntries,
  normalizeImportUpdateExisting,
  normalizeSystemDictImportRecord,
  parseSystemDictImport,
  SystemDictRepository,
  type DictBatchMutationRecord,
  type DictCacheRefreshRecord,
  type DictDeleteMutationRecord,
  type DictItemBatchMutationRecord,
  type DictItemDeleteMutationRecord,
  type DictTranslationResultRecord,
  type NormalizedSystemDictImportInput,
  type SystemDictImportFailureRecord,
  type SystemDictImportResultRecord,
  type SystemDictImportTemplateRecord,
  type SystemDictExportPreview,
  type SystemDictItemPageQuery,
  type SystemDictPageQuery,
} from './system-dict.repository';

@Injectable()
export class SystemDictService {
  constructor(private readonly repository: SystemDictRepository) {}

  listDicts(
    query: SystemDictPageQuery = {},
  ): Promise<PageResult<DictTypeRecord>> {
    return this.repository.listDicts(query);
  }

  listDictItemsPage(
    query: SystemDictItemPageQuery = {},
  ): Promise<PageResult<DictItemRecord>> {
    return this.repository.listDictItemsPage(query);
  }

  listDeletedDicts(
    query: SystemDictPageQuery = {},
  ): Promise<PageResult<DictTypeRecord>> {
    return this.repository.listDeletedDicts(query);
  }

  listDeletedDictItemsPage(
    query: SystemDictItemPageQuery = {},
  ): Promise<PageResult<DictItemRecord>> {
    return this.repository.listDeletedDictItemsPage(query);
  }

  getDict(code: string): Promise<DictTypeRecord> {
    return this.repository.getDict(code);
  }

  listDictDataOptions(
    query: DictDataOptionQueryDto = {},
  ): Promise<readonly DictDataOptionRecord[]> {
    return this.repository.listDictDataOptions(query);
  }

  listDictItems(code: string): Promise<readonly DictItemRecord[]> {
    return this.repository.listDictItems(code);
  }

  getDictItem(code: string, itemId: string): Promise<DictItemRecord> {
    return this.repository.getDictItem(code, itemId);
  }

  createDict(body: CreateDictTypeDto): Promise<DictTypeRecord> {
    return this.repository.createDict(body);
  }

  createDictItem(
    code: string,
    body: CreateDictItemDto,
  ): Promise<DictItemRecord> {
    return this.repository.createDictItem(code, body);
  }

  updateDict(code: string, body: UpdateDictTypeDto): Promise<DictTypeRecord> {
    return this.repository.updateDict(code, body);
  }

  updateDictItem(
    code: string,
    itemId: string,
    body: UpdateDictItemDto,
  ): Promise<DictItemRecord> {
    return this.repository.updateDictItem(code, itemId, body);
  }

  deleteDictItem(code: string, itemId: string): Promise<{ deleted: true }> {
    return this.repository.deleteDictItem(code, itemId);
  }

  deleteDict(code: string): Promise<{ deleted: true }> {
    return this.repository.deleteDict(code);
  }

  restoreDict(code: string): Promise<DictTypeRecord> {
    return this.repository.restoreDict(code);
  }

  restoreDictItem(itemId: string): Promise<DictItemRecord> {
    return this.repository.restoreDictItem(itemId);
  }

  hardDeleteDict(code: string): Promise<{ deleted: true }> {
    return this.repository.hardDeleteDict(code);
  }

  hardDeleteDictItem(itemId: string): Promise<{ deleted: true }> {
    return this.repository.hardDeleteDictItem(itemId);
  }

  deleteDicts(
    body: BatchDeleteDictTypesDto,
  ): Promise<DictDeleteMutationRecord> {
    return this.repository.deleteDicts(body);
  }

  updateDictStatus(
    body: BatchUpdateDictStatusDto,
  ): Promise<DictBatchMutationRecord> {
    return this.repository.updateDictStatus(body);
  }

  deleteDictItems(
    body: BatchDeleteDictItemsDto,
  ): Promise<DictItemDeleteMutationRecord> {
    return this.repository.deleteDictItems(body);
  }

  updateDictItemStatus(
    body: BatchUpdateDictItemStatusDto,
  ): Promise<DictItemBatchMutationRecord> {
    return this.repository.updateDictItemStatus(body);
  }

  refreshDictCache(): Promise<DictCacheRefreshRecord> {
    return this.repository.refreshDictCache();
  }

  async createExportPreview(
    query: SystemDictPageQuery = {},
  ): Promise<SystemDictExportPreview> {
    return createSystemDictExportPreview(
      await this.repository.listDicts(query),
    );
  }

  async createItemsExportPreview(
    query: SystemDictItemPageQuery = {},
  ): Promise<SystemDictExportPreview> {
    return createSystemDictItemsExportPreview(
      await this.repository.listDictItemsPage(query),
    );
  }

  createImportTemplate(): SystemDictImportTemplateRecord {
    return createSystemDictImportTemplate();
  }

  previewImportDicts(
    body: ImportDictsDto,
  ): Promise<SystemDictImportResultRecord> {
    return this.processImportDicts(body, true);
  }

  importDicts(body: ImportDictsDto): Promise<SystemDictImportResultRecord> {
    return this.processImportDicts(body, false);
  }

  async translateDictValues(
    body: TranslateDictValuesDto,
  ): Promise<DictTranslationResultRecord> {
    const entries = normalizeDictTranslationEntries(body);
    const options = await this.repository.listDictDataOptions();
    const optionByKey = new Map(
      options.map((option) => [
        `${option.dictCode}\u0000${option.value}`,
        option,
      ]),
    );

    return {
      translatedAt: new Date().toISOString(),
      items: entries.flatMap((entry) =>
        entry.values.map((value) => {
          const option = optionByKey.get(`${entry.dictCode}\u0000${value}`);
          return option
            ? {
                dictCode: entry.dictCode,
                value,
                found: true,
                label: option.label,
                colorType: option.colorType,
                cssClass: option.cssClass,
                enabled: option.enabled,
              }
            : {
                dictCode: entry.dictCode,
                value,
                found: false,
              };
        }),
      ),
    };
  }

  private async processImportDicts(
    body: ImportDictsDto,
    dryRun: boolean,
  ): Promise<SystemDictImportResultRecord> {
    const records = parseSystemDictImport(body);
    const updateExisting = normalizeImportUpdateExisting(body.updateExisting);
    const failures: SystemDictImportFailureRecord[] = [];
    const validInputs: NormalizedSystemDictImportInput[] = [];

    for (const record of records) {
      try {
        validInputs.push(normalizeSystemDictImportRecord(record));
      } catch (error) {
        failures.push({
          rowNumber: record.rowNumber,
          dictCode: record.values.dictCode || undefined,
          itemValue: record.values.itemValue || undefined,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const groups = new Map<string, NormalizedSystemDictImportInput[]>();
    for (const input of validInputs) {
      groups.set(input.dictCode, [
        ...(groups.get(input.dictCode) ?? []),
        input,
      ]);
    }

    const createdDictCodes: string[] = [];
    const updatedDictCodes: string[] = [];
    const createdItemRefs: string[] = [];
    const updatedItemRefs: string[] = [];

    for (const [dictCode, inputs] of groups) {
      const head = inputs[0];
      const existing = await this.findExistingDict(dictCode);

      if (existing && !updateExisting) {
        failures.push({
          rowNumber: head.rowNumber,
          dictCode,
          reason: `Dictionary already exists: ${dictCode}`,
        });
        continue;
      }

      try {
        if (!existing) {
          if (!dryRun) {
            await this.repository.createDict({
              code: dictCode,
              name: head.dictName,
              description: head.dictDescription,
              remark: head.dictRemark,
              enabled: head.dictEnabled,
            });
          }
          createdDictCodes.push(dictCode);
        } else if (updateExisting) {
          if (!dryRun) {
            await this.repository.updateDict(dictCode, {
              name: head.dictName,
              description: head.dictDescription,
              remark: head.dictRemark,
              enabled: existing.system ? existing.enabled : head.dictEnabled,
            });
          }
          updatedDictCodes.push(dictCode);
        }

        const existingItems = existing
          ? await this.repository.listDictItems(dictCode)
          : [];
        const existingItemByValue = new Map(
          existingItems.map((item) => [item.value, item]),
        );
        const seenImportValues = new Set<string>();

        for (const input of inputs) {
          if (!input.itemValue || !input.itemLabel) {
            continue;
          }

          const itemRef = `${dictCode}:${input.itemValue}`;
          if (seenImportValues.has(input.itemValue)) {
            failures.push({
              rowNumber: input.rowNumber,
              dictCode,
              itemValue: input.itemValue,
              reason: `Duplicate item value in import file: ${input.itemValue}`,
            });
            continue;
          }
          seenImportValues.add(input.itemValue);

          const existingItem = existingItemByValue.get(input.itemValue);
          if (existingItem && !updateExisting) {
            failures.push({
              rowNumber: input.rowNumber,
              dictCode,
              itemValue: input.itemValue,
              reason: `Dictionary item already exists: ${itemRef}`,
            });
            continue;
          }

          if (existingItem) {
            if (!dryRun) {
              await this.repository.updateDictItem(dictCode, existingItem.id, {
                label: input.itemLabel,
                sort: input.itemSort,
                enabled: input.itemEnabled,
                colorType: input.itemColorType,
                cssClass: input.itemCssClass,
                remark: input.itemRemark,
              });
            }
            updatedItemRefs.push(itemRef);
          } else {
            if (!dryRun) {
              await this.repository.createDictItem(dictCode, {
                label: input.itemLabel,
                value: input.itemValue,
                sort: input.itemSort,
                enabled: input.itemEnabled,
                colorType: input.itemColorType,
                cssClass: input.itemCssClass,
                remark: input.itemRemark,
              });
            }
            createdItemRefs.push(itemRef);
          }
        }
      } catch (error) {
        failures.push({
          rowNumber: head.rowNumber,
          dictCode,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      dryRun,
      totalRows: records.length,
      createdDicts: createdDictCodes.length,
      updatedDicts: updatedDictCodes.length,
      createdItems: createdItemRefs.length,
      updatedItems: updatedItemRefs.length,
      failed: failures.length,
      createdDictCodes,
      updatedDictCodes,
      createdItemRefs,
      updatedItemRefs,
      failures,
    };
  }

  private async findExistingDict(
    code: string,
  ): Promise<DictTypeRecord | undefined> {
    try {
      return await this.repository.getDict(code);
    } catch {
      return undefined;
    }
  }
}

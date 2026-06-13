import { BadRequestException } from '@nestjs/common';
import type {
  CreateSystemDeptDto,
  UpdateSystemDeptOrderDto,
  UpdateSystemDeptDto,
} from './system-dept.dto';
import type {
  SystemDeptOptionRecord,
  SystemDeptRecord,
  SystemDeptTreeRecord,
} from './system-dept.records';

export type SystemDeptExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: string[];
  rowCount: number;
  generatedAt: string;
};

export type SystemDeptQuery = {
  enabled?: boolean | string;
  parentId?: string;
};

export type SystemDeptFilters = {
  enabled?: boolean;
  parentId?: string;
};

export type NormalizedSystemDeptCreateInput = {
  code: string;
  name: string;
  parentId?: string;
  order: number;
  leader?: string;
  phone?: string;
  email?: string;
  enabled: boolean;
};

export type NormalizedSystemDeptUpdateInput = {
  name: string;
  parentId?: string;
  order: number;
  leader?: string;
  phone?: string;
  email?: string;
  enabled: boolean;
};

export type NormalizedSystemDeptOrderItem = {
  id: string;
  order: number;
};

export type SystemDeptOrderMutationResult = {
  updatedCount: number;
  items: SystemDeptRecord[];
};

const DEPT_CODE_PATTERN = /^[a-z][a-z0-9_.-]*$/;

export abstract class SystemDeptRepository {
  abstract listDeptTree(
    query?: SystemDeptQuery,
  ): Promise<SystemDeptTreeRecord[]>;

  abstract listDeptOptions(): Promise<SystemDeptOptionRecord[]>;

  abstract getDept(id: string): Promise<SystemDeptRecord>;

  abstract createDept(body: CreateSystemDeptDto): Promise<SystemDeptRecord>;

  abstract updateDept(
    id: string,
    body: UpdateSystemDeptDto,
  ): Promise<SystemDeptRecord>;

  abstract updateDeptOrder(
    body: UpdateSystemDeptOrderDto,
  ): Promise<SystemDeptOrderMutationResult>;

  abstract deleteDept(id: string): Promise<{ deleted: true }>;
}

export function normalizeSystemDeptFilters(
  query: SystemDeptQuery = {},
): SystemDeptFilters {
  return {
    enabled: normalizeOptionalBoolean(query.enabled),
    parentId: normalizeOptionalText(query.parentId),
  };
}

export function normalizeCreateSystemDeptInput(
  body: CreateSystemDeptDto,
): NormalizedSystemDeptCreateInput {
  const code = normalizeDeptCode(body.code);

  return {
    code,
    name: normalizeRequiredText(body.name, 'name'),
    parentId: normalizeOptionalText(body.parentId),
    order: normalizeOrder(body.order),
    leader: normalizeOptionalText(body.leader),
    phone: normalizeOptionalText(body.phone),
    email: normalizeOptionalText(body.email),
    enabled: body.enabled ?? true,
  };
}

export function normalizeUpdateSystemDeptInput(
  existing: SystemDeptRecord,
  body: UpdateSystemDeptDto,
): NormalizedSystemDeptUpdateInput {
  return {
    name:
      body.name === undefined
        ? existing.name
        : normalizeRequiredText(body.name, 'name'),
    parentId:
      body.parentId === undefined
        ? existing.parentId
        : normalizeOptionalText(body.parentId ?? undefined),
    order:
      body.order === undefined ? existing.order : normalizeOrder(body.order),
    leader:
      body.leader === undefined
        ? existing.leader
        : normalizeOptionalText(body.leader),
    phone:
      body.phone === undefined
        ? existing.phone
        : normalizeOptionalText(body.phone),
    email:
      body.email === undefined
        ? existing.email
        : normalizeOptionalText(body.email),
    enabled: body.enabled ?? existing.enabled,
  };
}

export function normalizeUpdateSystemDeptOrderInput(
  body: UpdateSystemDeptOrderDto,
): NormalizedSystemDeptOrderItem[] {
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new BadRequestException(
      'System dept order update requires at least one item.',
    );
  }

  const seenIds = new Set<string>();
  return body.items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new BadRequestException(
        `System dept order item ${index + 1} must be an object.`,
      );
    }

    const id = normalizeRequiredText(item.id, `items[${index}].id`);
    if (seenIds.has(id)) {
      throw new BadRequestException(
        `Duplicate system dept order item id: ${id}`,
      );
    }
    seenIds.add(id);

    return {
      id,
      order: normalizeOrder(item.order),
    };
  });
}

export function buildSystemDeptTree(
  rows: readonly SystemDeptRecord[],
): SystemDeptTreeRecord[] {
  const nodes = new Map<string, SystemDeptTreeRecord>();
  const roots: SystemDeptTreeRecord[] = [];

  for (const row of [...rows].sort(compareSystemDeptRecords)) {
    nodes.set(row.id, { ...row, children: [] });
  }

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
      continue;
    }

    roots.push(node);
  }

  return roots;
}

export function flattenSystemDeptTree(
  tree: readonly SystemDeptTreeRecord[],
): SystemDeptRecord[] {
  return tree.flatMap((node) => [
    withoutChildren(node),
    ...flattenSystemDeptTree(node.children),
  ]);
}

export function createSystemDeptExportPreview(
  tree: readonly SystemDeptTreeRecord[],
): SystemDeptExportPreview {
  return {
    filename: 'opencore-system-depts.csv',
    scope: 'current-page',
    columns: ['code', 'name', 'parentId', 'enabled'],
    rowCount: flattenSystemDeptTree(tree).length,
    generatedAt: new Date().toISOString(),
  };
}

export function toSystemDeptOptionRecord(
  dept: SystemDeptRecord,
): SystemDeptOptionRecord {
  return {
    id: dept.id,
    name: dept.name,
    parentId: dept.parentId,
    order: dept.order,
  };
}

export function assertNoDeptSelfParent(id: string, parentId?: string): void {
  if (parentId && parentId === id) {
    throw new BadRequestException('System dept cannot be its own parent.');
  }
}

export function assertNoDeptChildren(
  childCount: number,
  action = 'deleted',
): void {
  if (childCount > 0) {
    throw new BadRequestException(
      `System dept cannot be ${action} while it has children.`,
    );
  }
}

export function assertNoDeptUsers(userCount: number): void {
  if (userCount > 0) {
    throw new BadRequestException(
      'System dept cannot be deleted while users are assigned.',
    );
  }
}

export function assertSameDeptParent(
  rows: readonly SystemDeptRecord[],
  action = 'reordered',
): void {
  if (rows.length < 2) {
    return;
  }

  const firstParentId = rows[0]?.parentId;
  if (!rows.every((row) => row.parentId === firstParentId)) {
    throw new BadRequestException(
      `System dept siblings must share the same parent to be ${action}.`,
    );
  }
}

export function compareSystemDeptRecords(
  left: SystemDeptRecord,
  right: SystemDeptRecord,
): number {
  return left.order - right.order || left.name.localeCompare(right.name);
}

function normalizeDeptCode(value: string): string {
  const code = normalizeRequiredText(value, 'code');

  if (!DEPT_CODE_PATTERN.test(code)) {
    throw new BadRequestException(
      'System dept code must start with a lowercase letter and contain only lowercase letters, numbers, dot, underscore or dash.',
    );
  }

  return code;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`System dept ${fieldName} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeOptionalBoolean(
  value: boolean | string | undefined,
): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  throw new BadRequestException(`Invalid system dept enabled filter: ${value}`);
}

function normalizeOrder(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException(
      'System dept order must be a non-negative integer.',
    );
  }

  return value;
}

function withoutChildren(node: SystemDeptTreeRecord): SystemDeptRecord {
  return {
    id: node.id,
    code: node.code,
    name: node.name,
    parentId: node.parentId,
    order: node.order,
    leader: node.leader,
    phone: node.phone,
    email: node.email,
    enabled: node.enabled,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

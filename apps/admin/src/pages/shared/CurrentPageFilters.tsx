import { ClearOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Input, Select, Space, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

export type CurrentPageSearchField<T extends object> =
  | keyof T
  | string
  | ((record: T) => unknown);

export type CurrentPageFilterOption<T extends object> = {
  key: string;
  options: readonly { label: string; value: string }[];
  placeholder: string;
  predicate: (record: T, value: string) => boolean;
  width?: number;
};

type CurrentPageFilterState = Record<string, string | undefined>;

type FilterCurrentPageRowsOptions<T extends object> = {
  filterValues?: CurrentPageFilterState;
  rows: readonly T[];
  searchFields: readonly CurrentPageSearchField<T>[];
  searchText?: string;
  selectFilters?: readonly CurrentPageFilterOption<T>[];
};

type UseCurrentPageFiltersOptions<T extends object> = {
  rows: readonly T[];
  searchFields: readonly CurrentPageSearchField<T>[];
  searchPlaceholder?: string;
  selectFilters?: readonly CurrentPageFilterOption<T>[];
};

type UseCurrentPageFiltersResult<T extends object> = {
  filteredRows: T[];
  hasActiveFilters: boolean;
  toolbar: ReactNode;
};

const REDACTED_FILTER_TEXT_VALUE = '[redacted]';
const FILTER_TEXT_SENSITIVE_KEY_PATTERN =
  /password|secret|token|credential|authorization|api[-_]?key|client[-_]?secret/i;

function isPlainFilterTextObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function redactCurrentPageFilterValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactCurrentPageFilterValue(item));
  }

  if (!isPlainFilterTextObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      FILTER_TEXT_SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED_FILTER_TEXT_VALUE
        : redactCurrentPageFilterValue(fieldValue),
    ]),
  );
}

function normalizeFilterText(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeFilterText(item)).join(' ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(redactCurrentPageFilterValue(value));
  }

  return String(value);
}

function readDataIndex<T extends object>(
  record: T,
  dataIndex: keyof T | string,
): unknown {
  return String(dataIndex)
    .split('.')
    .reduce<unknown>((value, key) => {
      if (value && typeof value === 'object' && key in value) {
        return (value as Record<string, unknown>)[key];
      }
      return '';
    }, record);
}

function getSearchFieldValue<T extends object>(
  record: T,
  field: CurrentPageSearchField<T>,
): string {
  const value =
    typeof field === 'function' ? field(record) : readDataIndex(record, field);
  return normalizeFilterText(value).toLowerCase();
}

export function createCurrentPageFilterOptions<T extends object>(
  rows: readonly T[],
  field: CurrentPageSearchField<T>,
): { label: string; value: string }[] {
  return Array.from(
    new Set(
      rows
        .map((row) =>
          typeof field === 'function' ? field(row) : readDataIndex(row, field),
        )
        .map((value) => normalizeFilterText(value).trim())
        .filter(Boolean),
    ),
  ).map((value) => ({ label: value, value }));
}

function matchesSearchText<T extends object>(
  record: T,
  searchText: string,
  searchFields: readonly CurrentPageSearchField<T>[],
): boolean {
  const normalizedSearch = searchText.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return searchFields.some((field) =>
    getSearchFieldValue(record, field).includes(normalizedSearch),
  );
}

function matchesSelectFilters<T extends object>(
  record: T,
  selectFilters: readonly CurrentPageFilterOption<T>[],
  filterValues: CurrentPageFilterState,
): boolean {
  return selectFilters.every((filter) => {
    const value = filterValues[filter.key];
    return value ? filter.predicate(record, value) : true;
  });
}

export function filterCurrentPageRows<T extends object>({
  filterValues = {},
  rows,
  searchFields,
  searchText = '',
  selectFilters = [],
}: FilterCurrentPageRowsOptions<T>): T[] {
  return rows.filter(
    (row) =>
      matchesSearchText(row, searchText, searchFields) &&
      matchesSelectFilters(row, selectFilters, filterValues),
  );
}

export function useCurrentPageFilters<T extends object>({
  rows,
  searchFields,
  searchPlaceholder,
  selectFilters = [],
}: UseCurrentPageFiltersOptions<T>): UseCurrentPageFiltersResult<T> {
  const intl = useIntl();
  const [searchText, setSearchText] = useState('');
  const [filterValues, setFilterValues] = useState<CurrentPageFilterState>({});
  const resolvedSearchPlaceholder =
    searchPlaceholder ??
    intl.formatMessage({
      id: 'component.currentPageFilters.searchPlaceholder',
      defaultMessage: 'Search current page',
    });

  const filteredRows = useMemo(
    () =>
      filterCurrentPageRows({
        filterValues,
        rows,
        searchFields,
        searchText,
        selectFilters,
      }),
    [filterValues, rows, searchFields, searchText, selectFilters],
  );

  const hasActiveFilters =
    Boolean(searchText.trim()) ||
    Object.values(filterValues).some((value) => Boolean(value));

  const resetFilters = () => {
    setSearchText('');
    setFilterValues({});
  };

  const setFilterValue = (key: string, value?: string) => {
    setFilterValues((current) => ({ ...current, [key]: value }));
  };

  const toolbar = (
    <Space key="current-page-filters" wrap>
      <Input
        allowClear
        onChange={(event) => setSearchText(event.target.value)}
        placeholder={resolvedSearchPlaceholder}
        style={{ width: 220 }}
        value={searchText}
      />
      {selectFilters.map((filter) => (
        <Select
          allowClear
          key={filter.key}
          onChange={(value?: string) => setFilterValue(filter.key, value)}
          options={[...filter.options]}
          placeholder={filter.placeholder}
          style={{ width: filter.width ?? 168 }}
          value={filterValues[filter.key]}
        />
      ))}
      <Typography.Text type="secondary">
        {filteredRows.length}/{rows.length}
      </Typography.Text>
      <Button
        disabled={!hasActiveFilters}
        icon={<ClearOutlined />}
        onClick={resetFilters}
      >
        {intl.formatMessage({
          id: 'component.currentPageFilters.reset',
          defaultMessage: 'Reset',
        })}
      </Button>
    </Space>
  );

  return { filteredRows, hasActiveFilters, toolbar };
}

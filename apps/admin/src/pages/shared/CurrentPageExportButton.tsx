import { DownloadOutlined } from '@ant-design/icons';
import { createCurrentPageExportProtocolFixture } from '@opencore/sdk';
import { Button, message } from 'antd';

export type CurrentPageExportColumn<T extends object> = {
  dataIndex?: keyof T | string;
  renderText?: (record: T) => unknown;
  sensitive?: boolean;
  title: string;
};

type CurrentPageExportButtonProps<T extends object> = {
  columns: readonly CurrentPageExportColumn<T>[];
  disabled?: boolean;
  filename?: string;
  resource: string;
  rows: readonly T[];
};

const exportProtocol = createCurrentPageExportProtocolFixture();
const CSV_FORMULA_PREFIX_PATTERN = /^\s*[=+\-@]/;
const CSV_FILENAME_UNSAFE_PATTERN = new RegExp(
  '[\\\\/:*?"<>|\\x00-\\x1F]+',
  'g',
);
const REDACTED_EXPORT_CELL_VALUE = '[redacted]';
const EXPORT_CELL_SENSITIVE_KEY_PATTERN =
  /password|secret|token|credential|authorization|api[-_]?key|client[-_]?secret/i;

function isPlainExportCellObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function redactCurrentPageExportValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactCurrentPageExportValue(item));
  }

  if (!isPlainExportCellObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      EXPORT_CELL_SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED_EXPORT_CELL_VALUE
        : redactCurrentPageExportValue(fieldValue),
    ]),
  );
}

function normalizeCellValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeCellValue(item)).join('; ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(redactCurrentPageExportValue(value));
  }

  return String(value);
}

export function sanitizeCsvCellText(text: string): string {
  if (CSV_FORMULA_PREFIX_PATTERN.test(text)) {
    return `'${text}`;
  }

  return text;
}

export function sanitizeCsvFilename(filename: string): string {
  const basename = filename
    .trim()
    .replace(CSV_FILENAME_UNSAFE_PATTERN, '-')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '');
  const safeBasename = basename || 'opencore-export';

  return safeBasename.toLowerCase().endsWith('.csv')
    ? safeBasename
    : `${safeBasename}.csv`;
}

function toCsvCell(value: unknown): string {
  const text = sanitizeCsvCellText(normalizeCellValue(value)).replace(
    /"/g,
    '""',
  );
  return `"${text}"`;
}

function readDataIndex<T extends object>(
  record: T,
  dataIndex?: keyof T | string,
): unknown {
  if (!dataIndex) {
    return '';
  }

  return String(dataIndex)
    .split('.')
    .reduce<unknown>((value, key) => {
      if (value && typeof value === 'object' && key in value) {
        return (value as Record<string, unknown>)[key];
      }
      return '';
    }, record);
}

export function getExportableColumns<T extends object>(
  columns: readonly CurrentPageExportColumn<T>[],
): CurrentPageExportColumn<T>[] {
  return columns.filter((column) => !column.sensitive);
}

export function buildCurrentPageCsv<T extends object>(
  rows: readonly T[],
  columns: readonly CurrentPageExportColumn<T>[],
): string {
  const header = columns.map((column) => toCsvCell(column.title)).join(',');
  const body = rows.map((row) =>
    columns
      .map((column) =>
        toCsvCell(
          column.renderText
            ? column.renderText(row)
            : readDataIndex(row, column.dataIndex),
        ),
      )
      .join(','),
  );

  return [header, ...body].join('\n');
}

function downloadCsv(filename: string, csv: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CurrentPageExportButton<T extends object>({
  columns,
  disabled,
  filename,
  resource,
  rows,
}: CurrentPageExportButtonProps<T>) {
  return (
    <Button
      disabled={disabled}
      icon={<DownloadOutlined />}
      onClick={() => {
        const safeColumns = getExportableColumns(columns);
        const exportRows = rows.slice(0, exportProtocol.maxRows);

        if (exportRows.length === 0) {
          message.warning('There is no data to export');
          return;
        }

        const csv = buildCurrentPageCsv(exportRows, safeColumns);
        downloadCsv(
          sanitizeCsvFilename(filename ?? `opencore-${resource}.csv`),
          csv,
        );
        message.success(`Exported ${exportRows.length} current-page rows`);
      }}
    >
      Export
    </Button>
  );
}

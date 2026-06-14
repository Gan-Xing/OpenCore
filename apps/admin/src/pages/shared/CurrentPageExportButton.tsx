import { DownloadOutlined } from '@ant-design/icons';
import type { CurrentPageExportProtocolSummary } from '@opencore/sdk';
import { Button, message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { getOpenCoreExportProtocol } from '../../services/opencore/platform';

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

const LIVE_CURRENT_PAGE_EXPORT_PROTOCOL_LABEL =
  'Live current-page export protocol';
const SERVER_CAPPED_CURRENT_PAGE_EXPORT_LABEL =
  'Server capped current-page export';
const CSV_FORMULA_PREFIX_PATTERN = /^\s*[=+\-@]/;
const CSV_FILENAME_UNSAFE_PATTERN = new RegExp(
  '[\\\\/:*?"<>|\\x00-\\x1F]+',
  'g',
);
const REDACTED_EXPORT_CELL_VALUE = '[redacted]';
const EXPORT_CELL_SENSITIVE_KEY_PATTERN =
  /password|secret|token|credential|authorization|api[-_]?key|client[-_]?secret/i;
let currentPageExportProtocolCache:
  | CurrentPageExportProtocolSummary
  | undefined;
let currentPageExportProtocolPromise:
  | Promise<CurrentPageExportProtocolSummary>
  | undefined;

function loadCurrentPageExportProtocol(): Promise<CurrentPageExportProtocolSummary> {
  if (currentPageExportProtocolCache) {
    return Promise.resolve(currentPageExportProtocolCache);
  }

  currentPageExportProtocolPromise ??= Promise.resolve()
    .then(() => getOpenCoreExportProtocol())
    .then((protocol) => {
      currentPageExportProtocolCache = protocol;
      return protocol;
    })
    .catch((error) => {
      currentPageExportProtocolPromise = undefined;
      throw error;
    });

  return currentPageExportProtocolPromise;
}

function isUsableCurrentPageCsvProtocol(
  protocol: CurrentPageExportProtocolSummary,
): boolean {
  return (
    protocol.status === 'active' &&
    protocol.scope === 'current-page' &&
    protocol.supportedFormats.includes('csv') &&
    protocol.asyncExport === false &&
    Number.isFinite(protocol.maxRows) &&
    protocol.maxRows > 0
  );
}

function useCurrentPageExportProtocol() {
  const [protocol, setProtocol] = useState<
    CurrentPageExportProtocolSummary | undefined
  >(currentPageExportProtocolCache);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const liveProtocol = await loadCurrentPageExportProtocol();
      setProtocol(liveProtocol);
      return liveProtocol;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (currentPageExportProtocolCache) {
      setProtocol(currentPageExportProtocolCache);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    loadCurrentPageExportProtocol()
      .then((liveProtocol) => {
        if (mounted) {
          setProtocol(liveProtocol);
        }
      })
      .catch(() => {
        // Click handling surfaces the failure without spamming page load.
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { load, loading, protocol };
}

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
  const { load, loading, protocol } = useCurrentPageExportProtocol();

  const handleExport = async () => {
    let liveProtocol = protocol;
    if (!liveProtocol) {
      try {
        liveProtocol = await load();
      } catch {
        message.error(`${LIVE_CURRENT_PAGE_EXPORT_PROTOCOL_LABEL} unavailable`);
        return;
      }
    }

    if (!isUsableCurrentPageCsvProtocol(liveProtocol)) {
      message.error(`${LIVE_CURRENT_PAGE_EXPORT_PROTOCOL_LABEL} inactive`);
      return;
    }

    const safeColumns = getExportableColumns(columns);
    const maxRows = Math.floor(liveProtocol.maxRows);
    const exportRows = rows.slice(0, maxRows);

    if (exportRows.length === 0) {
      message.warning('There is no data to export');
      return;
    }

    const csv = buildCurrentPageCsv(exportRows, safeColumns);
    downloadCsv(
      sanitizeCsvFilename(filename ?? `opencore-${resource}.csv`),
      csv,
    );

    if (rows.length > exportRows.length) {
      message.info(`${SERVER_CAPPED_CURRENT_PAGE_EXPORT_LABEL} at ${maxRows}`);
    }
    message.success(`Exported ${exportRows.length} current-page rows`);
  };

  return (
    <Button
      disabled={disabled}
      icon={<DownloadOutlined />}
      loading={loading && !protocol}
      onClick={() => {
        void handleExport();
      }}
    >
      Export
    </Button>
  );
}

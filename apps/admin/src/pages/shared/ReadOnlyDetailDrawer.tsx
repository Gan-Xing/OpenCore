import { Descriptions, Drawer, Space, Timeline, Typography } from 'antd';
import type { ReactNode } from 'react';

export type DetailField = {
  label: string;
  sensitive?: boolean;
  value?: ReactNode;
};

export type DetailJsonSection = {
  title: string;
  value: unknown;
};

export type DetailTimelineEntry = {
  action: string;
  actor?: string;
  at?: string;
  color?: string;
};

type ReadOnlyDetailDrawerProps = {
  fields: readonly DetailField[];
  jsonSections?: readonly DetailJsonSection[];
  onClose: () => void;
  open: boolean;
  timeline?: readonly DetailTimelineEntry[];
  title: ReactNode;
};

const REDACTED_DETAIL_JSON_VALUE = '[redacted]';
const REDACTED_DETAIL_FIELD_VALUE = '[redacted]';
const DETAIL_JSON_SENSITIVE_KEY_PATTERN =
  /password|secret|token|credential|authorization|api[-_]?key|client[-_]?secret/i;

function isEmptyValue(value: ReactNode): boolean {
  return value === undefined || value === null || value === '';
}

function renderDetailFieldValue(field: DetailField): ReactNode {
  if (field.sensitive) {
    return REDACTED_DETAIL_FIELD_VALUE;
  }

  return isEmptyValue(field.value) ? '-' : field.value;
}

function isPlainDetailJsonObject(
  value: unknown,
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function redactDetailJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactDetailJsonValue(item));
  }

  if (!isPlainDetailJsonObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      DETAIL_JSON_SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED_DETAIL_JSON_VALUE
        : redactDetailJsonValue(fieldValue),
    ]),
  );
}

export function ReadOnlyDetailDrawer({
  fields,
  jsonSections = [],
  onClose,
  open,
  timeline = [],
  title,
}: ReadOnlyDetailDrawerProps) {
  return (
    <Drawer
      destroyOnClose
      open={open}
      title={title}
      width={720}
      onClose={onClose}
    >
      <Descriptions bordered column={1} size="small">
        {fields.map((field) => (
          <Descriptions.Item key={field.label} label={field.label}>
            {renderDetailFieldValue(field)}
          </Descriptions.Item>
        ))}
      </Descriptions>

      {jsonSections.map((section) => (
        <section key={section.title} style={{ marginTop: 24 }}>
          <Typography.Title level={5}>{section.title}</Typography.Title>
          <pre
            style={{
              background: '#f5f5f5',
              border: '1px solid #d9d9d9',
              margin: 0,
              maxHeight: 260,
              overflow: 'auto',
              padding: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {JSON.stringify(redactDetailJsonValue(section.value), null, 2)}
          </pre>
        </section>
      ))}

      {timeline.length > 0 ? (
        <section style={{ marginTop: 24 }}>
          <Typography.Title level={5}>Timeline</Typography.Title>
          <Timeline
            items={timeline.map((entry) => ({
              color: entry.color ?? 'blue',
              children: (
                <Space direction="vertical" size={2}>
                  <Typography.Text>{entry.action}</Typography.Text>
                  <Typography.Text type="secondary">
                    {[entry.actor, entry.at].filter(Boolean).join(' · ')}
                  </Typography.Text>
                </Space>
              ),
            }))}
          />
        </section>
      ) : null}
    </Drawer>
  );
}

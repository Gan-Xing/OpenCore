import { Space, Tag, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';
import { useDictOptions } from './useDictOptions';

export type DictTagProps = {
  dictCode: string;
  fallback?: string;
  showValueWhenMissing?: boolean;
  value?: string | readonly string[];
};

function toValues(value?: string | readonly string[]): string[] {
  if (typeof value === 'string') {
    return value ? [value] : [];
  }

  return value ? value.map(String).filter(Boolean) : [];
}

export function DictTag({
  dictCode,
  fallback = '-',
  showValueWhenMissing = true,
  value,
}: DictTagProps) {
  const values = useMemo(() => toValues(value), [value]);
  const { error, options } = useDictOptions(dictCode);
  const optionMap = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );

  if (values.length === 0) {
    return <Typography.Text type="secondary">{fallback}</Typography.Text>;
  }

  return (
    <Space size={[4, 4]} wrap>
      {values.map((itemValue) => {
        const option = optionMap.get(itemValue);
        const label =
          option?.label ?? (showValueWhenMissing ? itemValue : fallback);
        const tag = (
          <Tag
            key={itemValue}
            color={
              option?.colorType || (option?.enabled ? 'success' : 'default')
            }
          >
            {label}
          </Tag>
        );

        return error ? (
          <Tooltip key={itemValue} title={error}>
            {tag}
          </Tooltip>
        ) : (
          <span key={itemValue}>{tag}</span>
        );
      })}
    </Space>
  );
}

export default DictTag;

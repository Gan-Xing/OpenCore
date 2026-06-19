import type { AreaRegionTreeSummary } from '@opencore/sdk';
import { Cascader, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { listOpenCoreAreaTree } from '@/services/opencore/platform';

type AreaOption = {
  children?: AreaOption[];
  label: string;
  region: AreaRegionTreeSummary;
  value: string;
};

export type AreaCascaderProps = {
  allowClear?: boolean;
  disabled?: boolean;
  maxLevel?: number;
  onChange?: (
    value: readonly string[],
    regions: readonly AreaRegionTreeSummary[],
  ) => void;
  placeholder?: string;
  style?: CSSProperties;
  value?: readonly string[];
};

function toAreaOptions(nodes: readonly AreaRegionTreeSummary[]): AreaOption[] {
  return nodes.map((node) => ({
    children:
      node.children.length > 0 ? toAreaOptions(node.children) : undefined,
    label: node.name,
    region: node,
    value: node.code,
  }));
}

function filterAreaOption(input: string, path: readonly AreaOption[]) {
  const keyword = input.trim().toLowerCase();
  return path.some(
    (option) =>
      option.label.toLowerCase().includes(keyword) ||
      option.value.toLowerCase().includes(keyword),
  );
}

export default function AreaCascader({
  allowClear = true,
  disabled = false,
  maxLevel,
  onChange,
  placeholder = '请选择地区',
  style,
  value,
}: AreaCascaderProps) {
  const [tree, setTree] = useState<readonly AreaRegionTreeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const options = useMemo(() => toAreaOptions(tree), [tree]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listOpenCoreAreaTree({ maxLevel })
      .then((result) => {
        if (active) {
          setTree(result.items);
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const detail =
          error instanceof Error ? error.message : '地区树加载失败。';
        message.error(detail);
        setTree([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [maxLevel]);

  return (
    <Cascader
      allowClear={allowClear}
      changeOnSelect
      disabled={disabled}
      displayRender={(labels) => labels.join(' / ')}
      loading={loading}
      onChange={(nextValue, selectedOptions) => {
        onChange?.(
          (nextValue ?? []).map(String),
          ((selectedOptions ?? []) as AreaOption[]).map(
            (option) => option.region,
          ),
        );
      }}
      options={options}
      placeholder={placeholder}
      showSearch={{ filter: filterAreaOption }}
      style={style}
      value={value ? [...value] : undefined}
    />
  );
}

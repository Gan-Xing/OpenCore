import { Select, type SelectProps } from 'antd';
import { useMemo } from 'react';
import { useDictOptions } from './useDictOptions';

export type DictSelectProps<ValueType = string | string[]> = Omit<
  SelectProps<ValueType>,
  'loading' | 'options'
> & {
  dictCode: string;
  enabledOnly?: boolean;
};

export function DictSelect<ValueType = string | string[]>({
  dictCode,
  enabledOnly = true,
  placeholder = '请选择',
  ...props
}: DictSelectProps<ValueType>) {
  const { loading, options } = useDictOptions(dictCode, { enabledOnly });
  const selectOptions = useMemo(
    () =>
      options.map((option) => ({
        disabled: !option.enabled,
        label: option.label,
        value: option.value,
      })),
    [options],
  );

  return (
    <Select<ValueType>
      allowClear
      loading={loading}
      options={selectOptions}
      placeholder={placeholder}
      showSearch
      optionFilterProp="label"
      {...props}
    />
  );
}

export default DictSelect;

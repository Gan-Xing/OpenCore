import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import type { ListUsersRequest, UserSummary } from '@opencore/sdk';
import { Button, Modal, Space, Tag, TreeSelect } from 'antd';
import { useMemo, useRef, useState, type Key } from 'react';
import {
  listOpenCoreSystemDeptOptions,
  listOpenCoreUsers,
} from '@/services/opencore/platform';

type UserPickerProps = {
  buttonText: string;
  disabled?: boolean;
  disableSystem?: boolean;
  multiple?: boolean;
  onlyEnabled?: boolean;
  onChange: (userIds: string[], users: UserSummary[]) => void;
  selectedUsers: readonly UserSummary[];
  title: string;
  value: readonly string[];
};

type DeptNode = {
  children?: DeptNode[];
  title: string;
  value: string;
};

export function UserPicker({
  buttonText,
  disabled,
  disableSystem = true,
  multiple = true,
  onlyEnabled = true,
  onChange,
  selectedUsers,
  title,
  value,
}: UserPickerProps) {
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [deptId, setDeptId] = useState<string>();
  const [deptOptions, setDeptOptions] = useState<DeptNode[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([...value]);
  const [selectedRows, setSelectedRows] = useState<UserSummary[]>([
    ...selectedUsers,
  ]);
  const selectedById = useMemo(
    () => new Map(selectedUsers.map((user) => [user.id, user])),
    [selectedUsers],
  );

  const openPicker = async () => {
    setSelectedRowKeys([...value]);
    setSelectedRows([...selectedUsers]);
    setDeptOptions(toDeptTree(await listOpenCoreSystemDeptOptions()));
    setOpen(true);
  };

  const columns: ProColumns<UserSummary>[] = [
    {
      title: '账号',
      dataIndex: 'username',
    },
    {
      title: '显示名称',
      dataIndex: 'displayName',
    },
    {
      title: '手机号',
      dataIndex: 'mobile',
      responsive: ['lg'],
      render: (_, record) => record.mobile ?? '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      responsive: ['xl'],
      render: (_, record) => record.email ?? '-',
    },
    {
      title: '部门',
      dataIndex: 'deptId',
      search: false,
      render: (_, record) => record.deptName ?? record.deptId ?? '-',
    },
  ];

  return (
    <Space direction="vertical" size={4}>
      <Space wrap>
        <Button
          data-opencore-user-picker-button="true"
          disabled={disabled}
          onClick={() => void openPicker()}
        >
          {buttonText}
        </Button>
        {value.length > 0 ? (
          <Space wrap size={4}>
            {value.map((id) => {
              const user = selectedById.get(id);

              return <Tag key={id}>{user?.username ?? id}</Tag>;
            })}
          </Space>
        ) : null}
      </Space>
      <Modal
        destroyOnClose
        okText="确定"
        onCancel={() => setOpen(false)}
        onOk={() => {
          onChange(
            selectedRowKeys.map((key) => String(key)),
            selectedRows,
          );
          setOpen(false);
        }}
        open={open}
        data-opencore-user-picker-modal="true"
        title={title}
        width={860}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <TreeSelect
            allowClear
            onChange={(value) => {
              setDeptId(value);
              actionRef.current?.reload();
            }}
            placeholder="按部门筛选"
            style={{ width: '100%' }}
            treeData={deptOptions}
            treeDefaultExpandAll
            value={deptId}
          />
          <ProTable<UserSummary>
            actionRef={actionRef}
            columns={columns}
            options={false}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            request={async (params) => {
              const query: ListUsersRequest = {
                deptId,
                displayName: toOptionalText(params.displayName),
                enabled: onlyEnabled ? true : undefined,
                page: toPositiveNumber(params.current, 1),
                pageSize: toPositiveNumber(params.pageSize, 10),
                username: toOptionalText(params.username),
              };
              const page = await listOpenCoreUsers(query);

              return {
                data: [...page.list],
                success: true,
                total: page.total,
              };
            }}
            rowKey="id"
            rowSelection={{
              getCheckboxProps: (record) => ({
                disabled: (disableSystem && record.system) || !record.enabled,
              }),
              onChange: (keys, tableRows) => {
                const selectedIds = keys.map((key) => String(key));
                const knownUsers = new Map(
                  [...selectedRows, ...tableRows].map((user) => [
                    user.id,
                    user,
                  ]),
                );

                setSelectedRowKeys([...keys]);
                setSelectedRows(
                  selectedIds
                    .map((id) => knownUsers.get(id))
                    .filter((user): user is UserSummary => Boolean(user)),
                );
              },
              preserveSelectedRowKeys: true,
              selectedRowKeys,
              type: multiple ? 'checkbox' : 'radio',
            }}
            search={{ labelWidth: 72 }}
            size="small"
          />
        </Space>
      </Modal>
    </Space>
  );
}

function toDeptTree(
  rows: Awaited<ReturnType<typeof listOpenCoreSystemDeptOptions>>,
): DeptNode[] {
  const nodes = new Map<
    string,
    DeptNode & { order: number; parentId?: string }
  >();
  const roots: Array<DeptNode & { order: number; parentId?: string }> = [];

  for (const row of rows) {
    nodes.set(row.id, {
      children: [],
      order: row.order,
      parentId: row.parentId,
      title: row.name,
      value: row.id,
    });
  }

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children?.push(node);
    } else {
      roots.push(node);
    }
  }

  return sortDeptNodes(roots);
}

function sortDeptNodes(
  rows: Array<DeptNode & { order: number; parentId?: string }>,
): DeptNode[] {
  return rows
    .sort(
      (left, right) =>
        left.order - right.order || left.title.localeCompare(right.title),
    )
    .map(({ order: _order, parentId: _parentId, children, ...row }) => ({
      ...row,
      children: children
        ? sortDeptNodes(children as Array<DeptNode & { order: number }>)
        : [],
    }));
}

function toOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function toPositiveNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { Badge, Button, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import {
  getOpenCoreSystemNoticeUnreadCount,
  listOpenCoreUnreadSystemNotices,
  markAllOpenCoreSystemNoticesRead,
  markOpenCoreSystemNoticesRead,
} from '@/services/opencore/platform';
import HeaderDropdown from '../HeaderDropdown';

const useStyles = createStyles(({ token, css }) => ({
  action: css`
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 36px !important;
    min-width: 36px;
    padding-inline: 8px !important;
    padding-block: 0 !important;
    border-radius: ${token.borderRadius}px !important;
  `,
  noticeTitle: css`
    max-width: 260px;
    overflow: hidden;
    color: ${token.colorText};
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  noticeMeta: css`
    margin-top: 2px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
}));

export const NoticeBell: React.FC = () => {
  const { styles } = useStyles();
  const { initialState } = useModel('@@initialState');
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof listOpenCoreUnreadSystemNotices>>
  >([]);

  const loadNotices = async () => {
    if (!initialState?.currentUser) {
      setUnreadCount(0);
      setItems([]);
      return;
    }

    try {
      const [count, unread] = await Promise.all([
        getOpenCoreSystemNoticeUnreadCount(),
        listOpenCoreUnreadSystemNotices(5),
      ]);
      setUnreadCount(count.unreadCount);
      setItems(unread);
    } catch (_error) {
      setUnreadCount(0);
      setItems([]);
    }
  };

  useEffect(() => {
    void loadNotices();
  }, [initialState?.currentUser?.id]);

  const openInbox = () => {
    history.push('/system/notices?tab=inbox');
  };

  const markOneRead = async (id: string) => {
    await markOpenCoreSystemNoticesRead({ ids: [id] });
    await loadNotices();
    openInbox();
  };

  const markAllRead = async () => {
    await markAllOpenCoreSystemNoticesRead();
    await loadNotices();
    openInbox();
  };

  const menuItems: MenuProps['items'] =
    items.length > 0
      ? [
          {
            key: 'open-inbox',
            label: 'Open inbox',
            onClick: openInbox,
          },
          {
            key: 'mark-all',
            icon: <CheckOutlined />,
            label: 'Mark all read',
            onClick: () => void markAllRead(),
          },
          { type: 'divider' as const },
          ...items.map((notice) => ({
            key: notice.id,
            label: (
              <div>
                <div className={styles.noticeTitle}>{notice.title}</div>
                <div className={styles.noticeMeta}>
                  {notice.type} · {notice.publishedAt ?? notice.createdAt}
                </div>
              </div>
            ),
            onClick: () => void markOneRead(notice.id),
          })),
        ]
      : [
          {
            key: 'empty',
            disabled: true,
            label: 'No unread system notices',
          },
          {
            key: 'open-inbox',
            label: 'Open inbox',
            onClick: openInbox,
          },
        ];

  return (
    <HeaderDropdown
      placement="bottomRight"
      arrow
      menu={{
        selectedKeys: [],
        items: menuItems,
        style: { minWidth: 280 },
      }}
    >
      <Tooltip title="System notice inbox">
        <Badge count={unreadCount} size="small" overflowCount={99}>
          <Button
            type="text"
            className={styles.action}
            icon={<BellOutlined />}
            aria-label="System notice inbox"
          />
        </Badge>
      </Tooltip>
    </HeaderDropdown>
  );
};

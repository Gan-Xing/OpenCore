import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/pages/System/Notices.tsx', 'utf8');
const zhLocale = readFileSync('src/locales/zh-CN/pages.ts', 'utf8');

describe('System notices page contract', () => {
  it('keeps the three top-level tabs and merges productized views inside them', () => {
    expect(source).toContain(
      "type NoticeTab = 'manage' | 'inbox' | 'templates'",
    );
    expect(source).toContain(
      "type NoticeManageView = 'notices' | 'deliveryRecords'",
    );
    expect(source).toContain('listOpenCoreSystemNoticeDeliveryRecords');
    expect(source).toContain('testSendOpenCoreSystemNoticeTemplate');
  });

  it('keeps notice center filters and unread-only inbox selection wired', () => {
    expect(source).toContain('DatePicker.RangePicker');
    expect(source).toContain('getCheckboxProps');
    expect(source).toContain('markSelectedInboxNoticesRead');
    expect(source).toContain('setInboxPublishedRange');
    expect(source).toContain('setDeliveryDeliveredRange');
    expect(source).toContain('setTemplateCreatedRange');
  });

  it('keeps the notice center UI bounded and action-dense surfaces collapsed', () => {
    expect(source).toContain('const useStyles = createStyles');
    expect(source).toContain('renderTableToolbar');
    expect(source).toContain('renderNoticeActions');
    expect(source).toContain('<Dropdown');
    expect(source).toContain('scroll={{ x: 920 }}');
    expect(source).toContain('scroll={{ x: 980 }}');
    expect(source).not.toContain('width: 360');
    expect(source).not.toContain('getOpenCoreSystemNoticeInboxEventsPath');
    expect(zhLocale).toContain(
      "'pages.system.notices.inbox.realtimeStream': '实时同步已启用'",
    );
    expect(zhLocale).not.toContain('SSE 收件箱事件');
  });
});

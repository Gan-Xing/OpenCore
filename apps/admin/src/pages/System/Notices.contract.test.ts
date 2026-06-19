import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/pages/System/Notices.tsx', 'utf8');

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
});

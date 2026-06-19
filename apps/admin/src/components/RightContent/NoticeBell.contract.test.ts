import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  'src/components/RightContent/NoticeBell.tsx',
  'utf8',
);
const zhLocale = readFileSync('src/locales/zh-CN/pages.ts', 'utf8');

describe('NoticeBell contract', () => {
  it('keeps notice type metadata localized in the dropdown', () => {
    expect(source).toContain('noticeTypeLabels');
    expect(source).toContain('pages.system.notices.bell.itemMeta');
    expect(source).toContain('pages.system.notices.type.announcement');
    expect(source).not.toContain('{notice.type} ·');
  });

  it('keeps the bell menu wired to the inbox tab with view-all wording', () => {
    expect(source).toContain("history.push('/system/notices?tab=inbox')");
    expect(source).toContain("trigger={['click']}");
    expect(zhLocale).toContain(
      "'pages.system.notices.bell.openInbox': '查看全部'",
    );
  });
});

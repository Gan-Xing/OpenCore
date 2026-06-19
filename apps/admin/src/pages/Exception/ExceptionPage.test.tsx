import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForbiddenPage from './403';
import NotFoundPage from './404';
import ServerErrorPage from './500';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: {
    back: mocks.back,
    push: mocks.push,
  },
  useIntl: () => ({
    formatMessage: ({
      defaultMessage,
      id,
    }: {
      defaultMessage?: string;
      id: string;
    }) =>
      ({
        'pages.403.backButtonText': '返回上一页',
        'pages.403.description': '请确认当前账号已分配对应角色或权限。',
        'pages.403.subTitle': '抱歉，当前账号没有访问权限。',
        'pages.404.description': '请检查访问地址是否正确。',
        'pages.404.subTitle': '抱歉，您访问的页面不存在。',
        'pages.500.description': '请在服务恢复后刷新页面。',
        'pages.500.reloadButtonText': '刷新页面',
        'pages.500.subTitle': '抱歉，服务暂时不可用。',
        'pages.error.homeButtonText': '返回首页',
      })[id] ??
      defaultMessage ??
      id,
  }),
}));

vi.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ children, title }: any) => (
    <main aria-label={title}>{children}</main>
  ),
}));

describe('Exception pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 403 with back and home actions', () => {
    window.history.pushState({}, '', '/system/users');
    render(<ForbiddenPage />);

    expect(screen.getByText('抱歉，当前账号没有访问权限。')).toBeVisible();
    expect(screen.queryByText(/pages\./)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /返回上一页/ }));
    fireEvent.click(screen.getByRole('button', { name: /返回首页/ }));

    expect(mocks.back).toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith('/dashboard');
  });

  it('renders 404 with a home action only', () => {
    render(<NotFoundPage />);

    expect(screen.getByText('抱歉，您访问的页面不存在。')).toBeVisible();
    expect(screen.queryByRole('button', { name: /返回上一页/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /返回首页/ }));

    expect(mocks.push).toHaveBeenCalledWith('/dashboard');
  });

  it('renders 500 with reload and home actions', () => {
    const reload = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined);

    try {
      render(<ServerErrorPage />);

      expect(screen.getByText('抱歉，服务暂时不可用。')).toBeVisible();

      fireEvent.click(screen.getByRole('button', { name: /刷新页面/ }));
      fireEvent.click(screen.getByRole('button', { name: /返回首页/ }));

      expect(reload).toHaveBeenCalled();
      expect(mocks.push).toHaveBeenCalledWith('/dashboard');
    } finally {
      reload.mockRestore();
    }
  });
});

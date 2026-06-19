import { describe, expect, it } from 'vitest';
import routes from '../config/routes';

type AdminRoute = {
  component?: string;
  hideInMenu?: boolean;
  layout?: boolean;
  name?: string;
  path?: string;
  redirect?: string;
  routes?: AdminRoute[];
};

function flattenRoutes(items: readonly AdminRoute[]): AdminRoute[] {
  return items.flatMap((item) => [
    item,
    ...(item.routes ? flattenRoutes(item.routes) : []),
  ]);
}

describe('Admin routes', () => {
  const flatRoutes = flattenRoutes(routes as AdminRoute[]);

  it('registers hidden redirect and exception routes', () => {
    expect(flatRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          component: './Redirect',
          hideInMenu: true,
          layout: false,
          path: '/redirect/*',
        }),
        expect.objectContaining({
          component: './Exception/403',
          hideInMenu: true,
          name: 'exception.403',
          path: '/403',
        }),
        expect.objectContaining({
          component: './Exception/404',
          hideInMenu: true,
          name: 'exception.404',
          path: '/404',
        }),
        expect.objectContaining({
          component: './Exception/500',
          hideInMenu: true,
          name: 'exception.500',
          path: '/500',
        }),
      ]),
    );
  });

  it('keeps the catch-all route after explicit exception routes', () => {
    const explicit404Index = routes.findIndex((route) => route.path === '/404');
    const catchAllIndex = routes.findIndex((route) => route.path === '/*');

    expect(explicit404Index).toBeGreaterThanOrEqual(0);
    expect(catchAllIndex).toBeGreaterThan(explicit404Index);
  });
});

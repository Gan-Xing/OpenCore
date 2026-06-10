import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: 'OpenCore Admin',
  },
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      name: 'Dashboard',
      path: '/dashboard',
      component: './Dashboard',
      access: 'canAccessDashboard',
    },
    {
      name: 'OpenAPI',
      path: '/tools/openapi',
      component: './Tools/OpenApi',
      access: 'canReadOpenApiStatus',
    },
    {
      path: '/403',
      component: './Exception/403',
    },
    {
      path: '/404',
      component: './Exception/404',
    },
    {
      path: '/500',
      component: './Exception/500',
    },
    {
      path: '*',
      component: './Exception/404',
    },
  ],
  npmClient: 'pnpm',
  utoopack: {},
});

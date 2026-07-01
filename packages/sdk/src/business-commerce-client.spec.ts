import type { SdkRequest } from './rbac-client';
import { createBusinessCommerceClient } from './business-commerce-client';

describe('business commerce client', () => {
  it('maps commerce routes', async () => {
    const calls: Array<{ body?: unknown; method?: string; path: string }> = [];
    const request: SdkRequest = async (path, options = {}) => {
      calls.push({
        body: options.body,
        method: options.method,
        path,
      });
      return {} as never;
    };
    const client = createBusinessCommerceClient(request);

    await client.getSummary('token');
    await client.exportBusinessCommerce('token', {
      page: 2,
      pageSize: 20,
      resource: 'quotes',
    });
    await client.listProducts('token', { keyword: 'platform' });
    await client.getProduct('token', 'product 1');
    await client.createProduct('token', { name: 'Product', sku: 'SKU-1' });
    await client.updateProduct('token', 'product 1', { name: 'Product 2' });
    await client.archiveProduct('token', 'product 1');
    await client.listQuotes('token', { status: 'draft' });
    await client.getQuote('token', 'quote 1');
    await client.createQuote('token', {
      customerId: 'customer 1',
      lines: [{ productName: 'Product' }],
      name: 'Quote',
      owner: 'admin',
    });
    await client.updateQuote('token', 'quote 1', { name: 'Quote 2' });
    await client.submitQuote('token', 'quote 1', { actor: 'admin' });
    await client.acceptQuote('token', 'quote 1', { actor: 'admin' });
    await client.archiveQuote('token', 'quote 1');
    await client.listContracts('token', { status: 'active' });
    await client.getContract('token', 'contract 1');
    await client.createContract('token', {
      customerId: 'customer 1',
      name: 'Contract',
      owner: 'admin',
    });
    await client.updateContract('token', 'contract 1', { name: 'Contract 2' });
    await client.activateContract('token', 'contract 1', { actor: 'admin' });
    await client.completeContract('token', 'contract 1', { actor: 'admin' });
    await client.archiveContract('token', 'contract 1');
    await client.listReceivables('token', { status: 'pending' });
    await client.getReceivable('token', 'receivable 1');
    await client.createReceivable('token', {
      contractId: 'contract 1',
      dueAt: '2026-07-15T00:00:00.000Z',
      name: 'Receivable',
    });
    await client.updateReceivable('token', 'receivable 1', {
      name: 'Receivable 2',
    });
    await client.recordReceivablePayment('token', 'receivable 1', {
      actor: 'admin',
      amount: '10.00',
    });
    await client.cancelReceivable('token', 'receivable 1');

    expect(calls).toEqual([
      { path: '/business/commerce/summary' },
      {
        path: '/business/commerce/export?page=2&pageSize=20&resource=quotes',
      },
      { path: '/business/commerce/products?keyword=platform' },
      { path: '/business/commerce/products/product%201' },
      {
        body: { name: 'Product', sku: 'SKU-1' },
        method: 'POST',
        path: '/business/commerce/products',
      },
      {
        body: { name: 'Product 2' },
        method: 'PATCH',
        path: '/business/commerce/products/product%201',
      },
      { method: 'DELETE', path: '/business/commerce/products/product%201' },
      { path: '/business/commerce/quotes?status=draft' },
      { path: '/business/commerce/quotes/quote%201' },
      {
        body: {
          customerId: 'customer 1',
          lines: [{ productName: 'Product' }],
          name: 'Quote',
          owner: 'admin',
        },
        method: 'POST',
        path: '/business/commerce/quotes',
      },
      {
        body: { name: 'Quote 2' },
        method: 'PATCH',
        path: '/business/commerce/quotes/quote%201',
      },
      {
        body: { actor: 'admin' },
        method: 'PATCH',
        path: '/business/commerce/quotes/quote%201/submit',
      },
      {
        body: { actor: 'admin' },
        method: 'PATCH',
        path: '/business/commerce/quotes/quote%201/accept',
      },
      { method: 'DELETE', path: '/business/commerce/quotes/quote%201' },
      { path: '/business/commerce/contracts?status=active' },
      { path: '/business/commerce/contracts/contract%201' },
      {
        body: {
          customerId: 'customer 1',
          name: 'Contract',
          owner: 'admin',
        },
        method: 'POST',
        path: '/business/commerce/contracts',
      },
      {
        body: { name: 'Contract 2' },
        method: 'PATCH',
        path: '/business/commerce/contracts/contract%201',
      },
      {
        body: { actor: 'admin' },
        method: 'PATCH',
        path: '/business/commerce/contracts/contract%201/activate',
      },
      {
        body: { actor: 'admin' },
        method: 'PATCH',
        path: '/business/commerce/contracts/contract%201/complete',
      },
      { method: 'DELETE', path: '/business/commerce/contracts/contract%201' },
      { path: '/business/commerce/receivables?status=pending' },
      { path: '/business/commerce/receivables/receivable%201' },
      {
        body: {
          contractId: 'contract 1',
          dueAt: '2026-07-15T00:00:00.000Z',
          name: 'Receivable',
        },
        method: 'POST',
        path: '/business/commerce/receivables',
      },
      {
        body: { name: 'Receivable 2' },
        method: 'PATCH',
        path: '/business/commerce/receivables/receivable%201',
      },
      {
        body: { actor: 'admin', amount: '10.00' },
        method: 'PATCH',
        path: '/business/commerce/receivables/receivable%201/pay',
      },
      {
        method: 'DELETE',
        path: '/business/commerce/receivables/receivable%201',
      },
    ]);
  });
});

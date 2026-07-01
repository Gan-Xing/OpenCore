import {
  assertEqual,
  assertNumberAtLeast,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, checkDocs, clients, request, username } = smoke;
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const runSafeId = runId.replace(/[^a-z0-9]/gi, '_').toLowerCase();

async function main() {
  const created = {
    contracts: [] as string[],
    products: [] as string[],
    quotes: [] as string[],
    receivables: [] as string[],
  };

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      for (const path of [
        '/api/business/commerce/summary',
        '/api/business/commerce/export',
        '/api/business/commerce/products',
        '/api/business/commerce/products/{id}',
        '/api/business/commerce/quotes',
        '/api/business/commerce/quotes/{id}',
        '/api/business/commerce/quotes/{id}/submit',
        '/api/business/commerce/quotes/{id}/accept',
        '/api/business/commerce/contracts',
        '/api/business/commerce/contracts/{id}',
        '/api/business/commerce/contracts/{id}/activate',
        '/api/business/commerce/contracts/{id}/complete',
        '/api/business/commerce/receivables',
        '/api/business/commerce/receivables/{id}',
        '/api/business/commerce/receivables/{id}/pay',
      ]) {
        assertOpenApiPath(openApi, path);
      }
    }

    const loginResponse = await smoke.login();
    const token = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(token);

    const summary = await clients.businessCommerce.getSummary(token);
    assertNumberAtLeast(summary.products, 1, 'seeded products');
    assertNumberAtLeast(summary.activeContracts, 1, 'seeded active contracts');

    const product = await clients.businessCommerce.createProduct(token, {
      category: 'smoke',
      currency: 'USD',
      listPrice: '199.00',
      name: `Smoke Commerce Product ${runId}`,
      sku: `SMOKE-COM-${runSafeId}`,
      taxRate: '5.00',
      unit: 'seat',
    });
    created.products.push(assertString(product.id, 'created product id'));

    const customerPage = await clients.businessCore.listCustomers(token, {
      page: 1,
      pageSize: 1,
    });
    const customer = customerPage.items[0];
    if (!customer) {
      throw new Error('Expected at least one seeded business customer.');
    }

    const quote = await clients.businessCommerce.createQuote(token, {
      customerId: customer.id,
      lines: [
        {
          productName: product.name,
          quantity: '2',
          taxRate: '5',
          unit: product.unit,
          unitPrice: product.listPrice,
        },
      ],
      name: `Smoke Commerce Quote ${runId}`,
      owner: username,
      validUntil: '2026-08-01T00:00:00.000Z',
    });
    created.quotes.push(assertString(quote.id, 'created quote id'));
    assertEqual(quote.status, 'draft', 'created quote status');

    const submittedQuote = await clients.businessCommerce.submitQuote(
      token,
      quote.id,
      { actor: username },
    );
    assertEqual(submittedQuote.status, 'sent', 'submitted quote status');

    const acceptedQuote = await clients.businessCommerce.acceptQuote(
      token,
      quote.id,
      { actor: username },
    );
    assertEqual(acceptedQuote.status, 'accepted', 'accepted quote status');

    const contract = await clients.businessCommerce.createContract(token, {
      amount: acceptedQuote.totalAmount,
      customerId: customer.id,
      name: `Smoke Commerce Contract ${runId}`,
      owner: username,
      quoteId: acceptedQuote.id,
    });
    created.contracts.push(assertString(contract.id, 'created contract id'));
    assertEqual(contract.status, 'draft', 'created contract status');

    const activeContract = await clients.businessCommerce.activateContract(
      token,
      contract.id,
      { actor: username },
    );
    assertEqual(activeContract.status, 'active', 'active contract status');

    const receivable = await clients.businessCommerce.createReceivable(token, {
      amount: '100.00',
      contractId: activeContract.id,
      dueAt: '2026-08-15T00:00:00.000Z',
      name: `Smoke Commerce Receivable ${runId}`,
    });
    created.receivables.push(
      assertString(receivable.id, 'created receivable id'),
    );
    assertEqual(receivable.status, 'pending', 'created receivable status');

    const paidReceivable =
      await clients.businessCommerce.recordReceivablePayment(
        token,
        receivable.id,
        { actor: username, amount: '100.00' },
      );
    assertEqual(paidReceivable.status, 'paid', 'paid receivable status');

    const exportPreview = await clients.businessCommerce.exportBusinessCommerce(
      token,
      {
        page: 1,
        pageSize: 20,
        resource: 'quotes',
      },
    );
    assertEqual(exportPreview.scope, 'current-page', 'commerce export scope');
    assertNumberAtLeast(exportPreview.rowCount, 1, 'commerce export rows');

    console.log('business-commerce.summary');
    console.log('business-commerce.quote-contract-receivable');
    console.log('business-commerce.export');
  } finally {
    const token = (await tryLogin()) ?? undefined;
    if (token) {
      for (const id of created.receivables) {
        await clients.businessCommerce
          .cancelReceivable(token, id)
          .catch(() => undefined);
      }
      for (const id of created.contracts) {
        await clients.businessCommerce
          .archiveContract(token, id)
          .catch(() => undefined);
      }
      for (const id of created.quotes) {
        await clients.businessCommerce
          .archiveQuote(token, id)
          .catch(() => undefined);
      }
      for (const id of created.products) {
        await clients.businessCommerce
          .archiveProduct(token, id)
          .catch(() => undefined);
      }
    }
  }
}

async function tryLogin(): Promise<string | undefined> {
  try {
    const loginResponse = await smoke.login();
    return loginResponse.accessToken;
  } catch {
    return undefined;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { BusinessCommerceController } from './commerce.controller';

describe('BusinessCommerceController permission matrix', () => {
  it('guards commerce loop routes', () => {
    const expected: Array<[keyof BusinessCommerceController, string[]]> = [
      ['getSummary', ['business:commerce:read']],
      ['exportCommerce', ['business:commerce:export']],
      ['listProducts', ['business:commerce:read']],
      ['getProduct', ['business:commerce:read']],
      ['createProduct', ['business:commerce:create']],
      ['updateProduct', ['business:commerce:update']],
      ['archiveProduct', ['business:commerce:delete']],
      ['listQuotes', ['business:commerce:read']],
      ['getQuote', ['business:commerce:read']],
      ['createQuote', ['business:commerce:create']],
      ['updateQuote', ['business:commerce:update']],
      ['submitQuote', ['business:commerce:update']],
      ['acceptQuote', ['business:commerce:update']],
      ['archiveQuote', ['business:commerce:delete']],
      ['listContracts', ['business:commerce:read']],
      ['getContract', ['business:commerce:read']],
      ['createContract', ['business:commerce:create']],
      ['updateContract', ['business:commerce:update']],
      ['activateContract', ['business:commerce:update']],
      ['completeContract', ['business:commerce:update']],
      ['archiveContract', ['business:commerce:delete']],
      ['listReceivables', ['business:commerce:read']],
      ['getReceivable', ['business:commerce:read']],
      ['createReceivable', ['business:commerce:create']],
      ['updateReceivable', ['business:commerce:update']],
      ['recordReceivablePayment', ['business:commerce:update']],
      ['cancelReceivable', ['business:commerce:delete']],
    ];

    for (const [method, permissions] of expected) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          BusinessCommerceController.prototype[method],
        ),
      ).toEqual(permissions);
    }
  });
});

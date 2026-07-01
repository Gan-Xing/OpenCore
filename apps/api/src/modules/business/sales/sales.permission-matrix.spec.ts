import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { SalesController } from './sales.controller';

describe('SalesController permission matrix', () => {
  it('guards sales suite routes', () => {
    const expected: Array<[keyof SalesController, string[]]> = [
      ['getSummary', ['business:sales:read']],
      ['exportSales', ['business:sales:export']],
      ['listLeads', ['business:sales:read']],
      ['getLead', ['business:sales:read']],
      ['createLead', ['business:sales:create']],
      ['updateLead', ['business:sales:update']],
      ['convertLead', ['business:sales:update']],
      ['transferLeadOwner', ['business:sales:assign']],
      ['archiveLead', ['business:sales:delete']],
      ['listOpportunities', ['business:sales:read']],
      ['getOpportunity', ['business:sales:read']],
      ['createOpportunity', ['business:sales:create']],
      ['updateOpportunity', ['business:sales:update']],
      ['changeOpportunityStage', ['business:sales:update']],
      ['transferOpportunityOwner', ['business:sales:assign']],
      ['archiveOpportunity', ['business:sales:delete']],
    ];

    for (const [method, permissions] of expected) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          SalesController.prototype[method],
        ),
      ).toEqual(permissions);
    }
  });
});

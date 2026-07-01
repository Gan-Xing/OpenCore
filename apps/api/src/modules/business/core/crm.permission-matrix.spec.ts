import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { CrmController } from './crm.controller';

describe('CrmController permission matrix', () => {
  it('guards commercial CRM routes', () => {
    const expected: Array<[keyof CrmController, string[]]> = [
      ['getSummary', ['business:core:read']],
      ['exportCrm', ['business:core:export']],
      ['listTags', ['business:core:read']],
      ['createTag', ['business:core:create']],
      ['updateTag', ['business:core:update']],
      ['listLeads', ['business:core:read']],
      ['getLead', ['business:core:read']],
      ['createLead', ['business:core:create']],
      ['updateLead', ['business:core:update']],
      ['convertLead', ['business:core:update']],
      ['transferLeadOwner', ['business:core:assign']],
      ['archiveLead', ['business:core:delete']],
      ['listCustomers', ['business:core:read']],
      ['getCustomer', ['business:core:read']],
      ['createCustomer', ['business:core:create']],
      ['updateCustomer', ['business:core:update']],
      ['transferCustomerOwner', ['business:core:assign']],
      ['archiveCustomer', ['business:core:delete']],
      ['listContacts', ['business:core:read']],
      ['getContact', ['business:core:read']],
      ['createContact', ['business:core:create']],
      ['updateContact', ['business:core:update']],
      ['archiveContact', ['business:core:delete']],
      ['listOpportunities', ['business:core:read']],
      ['getOpportunity', ['business:core:read']],
      ['createOpportunity', ['business:core:create']],
      ['updateOpportunity', ['business:core:update']],
      ['changeOpportunityStage', ['business:core:update']],
      ['transferOpportunityOwner', ['business:core:assign']],
      ['archiveOpportunity', ['business:core:delete']],
      ['listFollowUps', ['business:core:read']],
      ['createFollowUp', ['business:core:comment']],
      ['listTasks', ['business:core:read']],
      ['createTask', ['business:core:update']],
      ['completeTask', ['business:core:update']],
      ['listAttachments', ['business:core:read']],
      ['createAttachment', ['business:core:update']],
      ['listOwnerTransfers', ['business:core:read']],
      ['listAuditEvents', ['business:core:read']],
    ];

    for (const [method, permissions] of expected) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          CrmController.prototype[method],
        ),
      ).toEqual(permissions);
    }
  });
});

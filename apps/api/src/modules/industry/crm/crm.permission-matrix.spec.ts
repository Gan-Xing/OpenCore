import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { CrmController } from './crm.controller';

describe('CrmController permission matrix', () => {
  it('guards commercial CRM routes', () => {
    const expected: Array<[keyof CrmController, string[]]> = [
      ['getSummary', ['industry:crm:read']],
      ['exportCrm', ['industry:crm:export']],
      ['listTags', ['industry:crm:read']],
      ['createTag', ['industry:crm:create']],
      ['updateTag', ['industry:crm:update']],
      ['listLeads', ['industry:crm:read']],
      ['getLead', ['industry:crm:read']],
      ['createLead', ['industry:crm:create']],
      ['updateLead', ['industry:crm:update']],
      ['convertLead', ['industry:crm:update']],
      ['transferLeadOwner', ['industry:crm:assign']],
      ['archiveLead', ['industry:crm:delete']],
      ['listCustomers', ['industry:crm:read']],
      ['getCustomer', ['industry:crm:read']],
      ['createCustomer', ['industry:crm:create']],
      ['updateCustomer', ['industry:crm:update']],
      ['transferCustomerOwner', ['industry:crm:assign']],
      ['archiveCustomer', ['industry:crm:delete']],
      ['listContacts', ['industry:crm:read']],
      ['getContact', ['industry:crm:read']],
      ['createContact', ['industry:crm:create']],
      ['updateContact', ['industry:crm:update']],
      ['archiveContact', ['industry:crm:delete']],
      ['listOpportunities', ['industry:crm:read']],
      ['getOpportunity', ['industry:crm:read']],
      ['createOpportunity', ['industry:crm:create']],
      ['updateOpportunity', ['industry:crm:update']],
      ['changeOpportunityStage', ['industry:crm:update']],
      ['transferOpportunityOwner', ['industry:crm:assign']],
      ['archiveOpportunity', ['industry:crm:delete']],
      ['listFollowUps', ['industry:crm:read']],
      ['createFollowUp', ['industry:crm:comment']],
      ['listTasks', ['industry:crm:read']],
      ['createTask', ['industry:crm:update']],
      ['completeTask', ['industry:crm:update']],
      ['listAttachments', ['industry:crm:read']],
      ['createAttachment', ['industry:crm:update']],
      ['listOwnerTransfers', ['industry:crm:read']],
      ['listAuditEvents', ['industry:crm:read']],
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

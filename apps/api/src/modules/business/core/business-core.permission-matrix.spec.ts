import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { BusinessCoreController } from './business-core.controller';

describe('BusinessCoreController permission matrix', () => {
  it('guards reusable business core routes', () => {
    const expected: Array<[keyof BusinessCoreController, string[]]> = [
      ['exportBusiness', ['business:core:export']],
      ['listTags', ['business:core:read']],
      ['createTag', ['business:core:create']],
      ['updateTag', ['business:core:update']],
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
      ['listActivities', ['business:core:read']],
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
          BusinessCoreController.prototype[method],
        ),
      ).toEqual(permissions);
    }
  });
});

import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { BusinessLifecycleController } from './lifecycle.controller';

describe('BusinessLifecycleController permission matrix', () => {
  it('guards lifecycle and assignment routes', () => {
    const expected: Array<[keyof BusinessLifecycleController, string[]]> = [
      ['getSummary', ['business:lifecycle:read']],
      ['exportLifecycle', ['business:lifecycle:export']],
      ['listPoolEntries', ['business:lifecycle:read']],
      ['enterPool', ['business:lifecycle:create']],
      ['claimPoolEntry', ['business:lifecycle:update']],
      ['assignPoolEntry', ['business:lifecycle:assign']],
      ['transferPoolEntry', ['business:lifecycle:assign']],
      ['recyclePoolEntry', ['business:lifecycle:update']],
      ['listCustomers', ['business:lifecycle:read']],
      ['changeCustomerStage', ['business:lifecycle:update']],
      ['listCustomerTimeline', ['business:lifecycle:read']],
      ['listAssignmentEvents', ['business:lifecycle:read']],
      ['listLifecycleEvents', ['business:lifecycle:read']],
      ['listDuplicateGroups', ['business:lifecycle:read']],
    ];

    for (const [method, permissions] of expected) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          BusinessLifecycleController.prototype[method],
        ),
      ).toEqual(permissions);
    }
  });
});

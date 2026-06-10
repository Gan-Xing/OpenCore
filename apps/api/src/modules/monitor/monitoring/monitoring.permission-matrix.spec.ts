import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { MonitoringController } from './monitoring.controller';

describe('MonitoringController permission matrix', () => {
  it('guards monitor routes with S8 permission codes', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MonitoringController.prototype.getStatus,
      ),
    ).toEqual(['monitor:status:read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MonitoringController.prototype.getVersion,
      ),
    ).toEqual(['monitor:version:read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        MonitoringController.prototype.listQueues,
      ),
    ).toEqual(['monitor:queue:read']);
  });
});

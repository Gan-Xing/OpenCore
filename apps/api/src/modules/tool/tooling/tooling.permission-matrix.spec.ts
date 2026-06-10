import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { ToolingController } from './tooling.controller';

describe('ToolingController permission matrix', () => {
  it('guards tool routes with S8 permission codes', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        ToolingController.prototype.getOpenApiDriftStatus,
      ),
    ).toEqual(['tool:openapi:read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        ToolingController.prototype.getExportProtocol,
      ),
    ).toEqual(['tool:export:read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        ToolingController.prototype.createExportPreview,
      ),
    ).toEqual(['tool:export:export']);
  });
});

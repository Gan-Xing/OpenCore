import { SetMetadata } from '@nestjs/common';

export const AUDIT_OPERATION_KEY = 'opencore.auditOperation';

export type AuditOperationOptions = {
  action?: string;
  resource?: string;
  resourceIdField?: string;
  disabled?: boolean;
};

export function AuditOperation(options: AuditOperationOptions = {}) {
  return SetMetadata(AUDIT_OPERATION_KEY, options);
}

export function SkipAuditOperation() {
  return AuditOperation({ disabled: true });
}

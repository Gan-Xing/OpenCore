export default {
  'error.AUTH_INVALID_CREDENTIALS': 'Invalid username or password.',
  'error.AUTH_USER_UNAVAILABLE': 'The user is disabled or does not exist.',
  'error.AUTH_SOCIAL_ACCOUNT_ALREADY_BOUND':
    'This social account is already bound to another OpenCore user.',
  'error.AUTH_SOCIAL_ACCOUNT_AMBIGUOUS':
    'This social account has an invalid binding state.',
  'error.AUTH_SOCIAL_FIELD_REQUIRED': 'A social login parameter is required.',
  'error.AUTH_SOCIAL_FLOW_NOT_COMPLETED':
    'The social login flow has not completed or has expired.',
  'error.AUTH_SOCIAL_PROVIDER_NOT_FOUND':
    'The social login provider does not exist.',
  'error.AUTH_SOCIAL_PROVIDER_NOT_READY':
    'The social login provider is not configured.',
  'error.AUTH_SOCIAL_PROVIDER_UNSUPPORTED':
    'This social login provider is not enabled for callback login.',
  'error.AUTH_SOCIAL_TOKEN_UNAVAILABLE':
    'The social login credential is unavailable. Start login again.',
  'error.AUTH_BEARER_TOKEN_MISSING': 'Please sign in first.',
  'error.AUTH_BEARER_TOKEN_INVALID':
    'The sign-in credential is invalid. Please sign in again.',
  'error.AUTH_BEARER_TOKEN_INVALID_PAYLOAD':
    'The sign-in credential is invalid. Please sign in again.',
  'error.AUTH_BEARER_TOKEN_EXPIRED':
    'The sign-in credential has expired. Please sign in again.',
  'error.AUTH_LOGIN_TICKET_INVALID':
    'The tenant selection ticket is invalid. Please sign in again.',
  'error.AUTH_LOGIN_TICKET_MISSING':
    'The tenant selection ticket is missing. Please sign in again.',
  'error.AUTH_TENANT_CONTEXT_MISMATCH':
    'The session tenant context is invalid. Please sign in again.',
  'error.AUTH_TENANT_CONTEXT_MISSING':
    'The session is missing tenant context. Please sign in again.',
  'error.AUTH_TENANT_UNAVAILABLE':
    'No active tenant membership is available for this account.',
  'error.SECURITY_LOGIN_LOCKOUT_OCCURRED_AT_INVALID':
    'The login lockout attempt time is invalid.',
  'error.SECURITY_LOGIN_LOCKOUT_POLICY_INVALID':
    'The login lockout policy is invalid.',
  'error.SECURITY_LOGIN_USERNAME_REQUIRED': 'The login username is required.',
  'error.RBAC_PERMISSION_MISSING':
    'Your account is missing the required permission.',
  'error.RBAC_PERMISSION_ALREADY_EXISTS': 'The permission code already exists.',
  'error.RBAC_PERMISSION_CODE_INVALID': 'The permission code is invalid.',
  'error.RBAC_PERMISSION_FIELD_REQUIRED':
    'A required permission field is missing.',
  'error.RBAC_PERMISSION_NOT_FOUND': 'The permission does not exist.',
  'error.RBAC_ROLE_MISSING': 'Your account is missing the required role.',
  'error.RBAC_SYSTEM_PERMISSION_IMMUTABLE':
    'Built-in system permissions cannot be changed or deleted.',
  'error.AUTH_USER_MISSING':
    'The current signed-in user is missing. Please sign in again.',
  'error.UNAUTHORIZED': 'Your session has expired. Please sign in again.',
  'error.FORBIDDEN': 'Your account does not have permission for this action.',
  'error.AUDIT_LOGIN_DATE_INVALID': 'The login log date filter is invalid.',
  'error.AUDIT_LOGIN_DATE_RANGE_INVALID':
    'The login log start time must not be later than the end time.',
  'error.AUDIT_LOGIN_IDS_EMPTY': 'The login log ID list must not be empty.',
  'error.AUDIT_LOGIN_IDS_INVALID': 'The login log ID list must be an array.',
  'error.AUDIT_LOGIN_ID_DUPLICATED': 'The login log ID is duplicated.',
  'error.AUDIT_LOGIN_ID_INVALID_TYPE': 'The login log ID must be a string.',
  'error.AUDIT_LOGIN_ID_REQUIRED': 'The login log ID is required.',
  'error.AUDIT_LOGIN_LOG_NOT_FOUND': 'The login log does not exist.',
  'error.AUDIT_LOGIN_LOG_TYPE_INVALID': 'The login log type is invalid.',
  'error.AUDIT_LOGIN_RESULT_INVALID': 'The login log result is invalid.',
  'error.AUDIT_OPERATION_DATE_INVALID':
    'The operation log date filter is invalid.',
  'error.AUDIT_OPERATION_DURATION_INVALID':
    'The operation log duration filter is invalid.',
  'error.AUDIT_OPERATION_DURATION_RANGE_INVALID':
    'The operation log minimum duration must not exceed the maximum duration.',
  'error.AUDIT_OPERATION_IDS_EMPTY':
    'The operation log ID list must not be empty.',
  'error.AUDIT_OPERATION_IDS_INVALID':
    'The operation log ID list must be an array.',
  'error.AUDIT_OPERATION_ID_DUPLICATED': 'The operation log ID is duplicated.',
  'error.AUDIT_OPERATION_ID_INVALID_TYPE':
    'The operation log ID must be a string.',
  'error.AUDIT_OPERATION_ID_REQUIRED': 'The operation log ID is required.',
  'error.AUDIT_OPERATION_LOG_NOT_FOUND': 'The operation log does not exist.',
  'error.AUDIT_OPERATION_RETENTION_DAYS_INVALID':
    'The operation log retention period is invalid.',
  'error.AUDIT_OPERATION_STATUS_FILTER_INVALID':
    'The operation log status filter is invalid.',
  'error.FILE_MIME_TYPE_INVALID': 'The file MIME type is invalid.',
  'error.FILE_NAME_INVALID': 'The file name must be a plain file name.',
  'error.FILE_OBJECT_PREFIX_INVALID':
    'The object prefix must be a relative prefix.',
  'error.FILE_OBJECT_PREFIX_RESERVED':
    'The object prefix cannot reuse a reserved prefix.',
  'error.FILE_SIZE_INVALID': 'The file size must be positive.',
  'error.FILE_STORAGE_KEY_INVALID':
    'The storage object key must be a relative path.',
  'error.SYSTEM_AUTH_USER_REQUIRED':
    'The current signed-in user is missing. Please sign in again.',
  'error.SYSTEM_FILE_ASSET_EXISTS': 'The file asset already exists.',
  'error.SYSTEM_FILE_ASSET_NOT_FOUND': 'The file asset does not exist.',
  'error.SYSTEM_FILE_CONTENT_BASE64_INVALID':
    'The file content must be valid base64.',
  'error.SYSTEM_FILE_CONTENT_EMPTY': 'The file content must not be empty.',
  'error.SYSTEM_FILE_OBJECT_NOT_FOUND':
    'The stored file object does not exist.',
  'error.SYSTEM_FILE_TENANT_ID_INVALID':
    'The file tenant cannot be used in a storage prefix.',
  'error.SYSTEM_IP_ADDRESS_REQUIRED': 'The IP address is required.',
  'error.BAD_REQUEST': 'The request is invalid.',
  'error.VALIDATION_FAILED': 'The submitted content failed validation.',
  'error.NOT_FOUND': 'The requested resource does not exist.',
  'error.CONFLICT': 'The current data state conflicts. Refresh and try again.',
  'error.RATE_LIMITED': 'Too many requests. Please try again later.',
  'error.HTTP_400': 'The request is invalid.',
  'error.HTTP_401': 'Your session has expired. Please sign in again.',
  'error.HTTP_403': 'Your account does not have access.',
  'error.HTTP_404': 'The requested resource does not exist.',
  'error.HTTP_409': 'The current data state conflicts. Refresh and try again.',
  'error.PAYLOAD_TOO_LARGE': 'The upload is too large. Compress it and retry.',
  'error.INTERNAL_SERVER_ERROR':
    'The service is temporarily unavailable. Please try again later.',
  'error.ONLINE_USER_EXPIRED_BEFORE_INVALID':
    'The expiration cleanup time must be a valid ISO date-time.',
  'error.ONLINE_USER_SESSION_ALREADY_REVOKED':
    'The online session has already been kicked out.',
  'error.ONLINE_USER_SESSION_NOT_FOUND': 'The online session does not exist.',
  'error.ONLINE_USER_TOKEN_EXPIRED':
    'The sign-in session has expired. Please sign in again.',
  'error.ONLINE_USER_TOKEN_REVOKED':
    'The sign-in session was kicked out. Please sign in again.',
  'error.ONLINE_USER_TOKEN_SESSION_UNREGISTERED':
    'The sign-in session is not registered. Please sign in again.',
  'error.USER_AVATAR_BYTES_MISMATCH':
    'The avatar file bytes do not match the declared image type.',
  'error.USER_AVATAR_CONTENT_INVALID_TYPE':
    'The avatar file content is invalid.',
  'error.USER_AVATAR_FILE_REQUIRED': 'Choose an avatar file.',
  'error.USER_AVATAR_MIME_TYPE_INVALID_TYPE':
    'The avatar MIME type must be a string.',
  'error.USER_AVATAR_MIME_TYPE_UNSUPPORTED':
    'The avatar MIME type must be PNG, JPEG, WebP, or GIF.',
  'error.USER_AVATAR_NOT_FOUND': 'The user avatar does not exist.',
  'error.USER_AVATAR_ORIGINAL_NAME_INVALID':
    'The avatar file name must be a plain file name.',
  'error.USER_AVATAR_ORIGINAL_NAME_INVALID_TYPE':
    'The avatar file name must be a string.',
  'error.USER_AVATAR_STORAGE_WRITE_FAILED':
    'Unable to save the avatar file. Please try again later.',
  'error.USER_AVATAR_TOO_LARGE': 'The avatar file is too large.',
  'error.SYSTEM_ROLE_USER_IDS_INVALID': 'The role user list must be an array.',
  'error.SYSTEM_ROLE_USER_ID_DUPLICATED': 'The role user ID is duplicated.',
  'error.SYSTEM_USER_ALREADY_EXISTS': 'The username already exists.',
  'error.SYSTEM_USER_BOOLEAN_INVALID':
    'The user boolean field must be a boolean.',
  'error.SYSTEM_USER_CURRENT_PASSWORD_INVALID':
    'The current password is incorrect.',
  'error.SYSTEM_USER_DATA_SCOPE_IDS_INVALID':
    'The user data-scope ID list must be an array.',
  'error.SYSTEM_USER_DATA_SCOPE_ID_DUPLICATED':
    'The user data-scope ID is duplicated.',
  'error.SYSTEM_USER_DATA_SCOPE_TYPE_INVALID':
    'The user data-scope type is invalid.',
  'error.SYSTEM_USER_DATE_INVALID': 'The user date field is invalid.',
  'error.SYSTEM_USER_DATE_INVALID_TYPE':
    'The user date field must be a string.',
  'error.SYSTEM_USER_DEPT_NOT_FOUND': 'The user department does not exist.',
  'error.SYSTEM_USER_EMAIL_EXISTS':
    'The user email is already used by another user.',
  'error.SYSTEM_USER_EMAIL_INVALID': 'The user email is invalid.',
  'error.SYSTEM_USER_ENABLED_INVALID':
    'The user enabled field must be a boolean.',
  'error.SYSTEM_USER_FIELD_INVALID_TYPE': 'The user field type is invalid.',
  'error.SYSTEM_USER_FIELD_REQUIRED': 'A required user field is missing.',
  'error.SYSTEM_USER_GENDER_INVALID': 'The user gender is invalid.',
  'error.SYSTEM_USER_IDS_EMPTY': 'The user ID list must not be empty.',
  'error.SYSTEM_USER_IDS_INVALID': 'The user ID list must be an array.',
  'error.SYSTEM_USER_ID_DUPLICATED': 'The user ID is duplicated.',
  'error.SYSTEM_USER_ID_INVALID_TYPE': 'The user ID must be a string.',
  'error.SYSTEM_USER_IMPORT_COLUMN_MISSING':
    'The user import file is missing a required column.',
  'error.SYSTEM_USER_IMPORT_CONTENT_BASE64_INVALID':
    'The user import content must be valid base64.',
  'error.SYSTEM_USER_IMPORT_CONTENT_EMPTY':
    'The user import content must not be empty.',
  'error.SYSTEM_USER_IMPORT_CONTENT_TOO_LARGE':
    'The user import file is too large.',
  'error.SYSTEM_USER_IMPORT_CSV_UNCLOSED_QUOTE':
    'The user import CSV has an unclosed quote.',
  'error.SYSTEM_USER_IMPORT_DATA_ROW_REQUIRED':
    'The user import file requires at least one non-empty data row.',
  'error.SYSTEM_USER_IMPORT_ROWS_REQUIRED':
    'The user import file must contain a header and at least one data row.',
  'error.SYSTEM_USER_IMPORT_UPDATE_EXISTING_INVALID':
    'The user import update-existing option must be a boolean.',
  'error.SYSTEM_USER_IMPORT_XLSX_INVALID':
    'The user import XLSX must be a valid workbook.',
  'error.SYSTEM_USER_IMPORT_XLSX_SHEET_MISSING':
    'The user import XLSX is missing its worksheet.',
  'error.SYSTEM_USER_MOBILE_EXISTS':
    'The user mobile is already used by another user.',
  'error.SYSTEM_USER_MOBILE_INVALID': 'The user mobile is invalid.',
  'error.SYSTEM_USER_NOT_FOUND': 'The user does not exist.',
  'error.SYSTEM_USER_ORDER_BY_INVALID': 'The user sort field is invalid.',
  'error.SYSTEM_USER_ORDER_DIRECTION_INVALID':
    'The user sort direction is invalid.',
  'error.SYSTEM_USER_PAGINATION_INVALID':
    'The user pagination parameters are invalid.',
  'error.SYSTEM_USER_PASSWORD_UNCHANGED':
    'The new password must be different from the old password.',
  'error.SYSTEM_USER_POST_CODES_INVALID':
    'The user post code list must be an array.',
  'error.SYSTEM_USER_POST_CODE_DUPLICATED': 'The user post code is duplicated.',
  'error.SYSTEM_USER_POST_NOT_FOUND': 'The user post does not exist.',
  'error.SYSTEM_USER_ROLE_ASSIGN_SYSTEM_FORBIDDEN':
    'Built-in system users cannot be assigned roles.',
  'error.SYSTEM_USER_ROLE_CODES_INVALID':
    'The user role code list must be an array.',
  'error.SYSTEM_USER_ROLE_CODE_DUPLICATED': 'The user role code is duplicated.',
  'error.SYSTEM_USER_ROLE_NOT_FOUND': 'The user role does not exist.',
  'error.SYSTEM_USER_SYSTEM_IMMUTABLE':
    'Built-in system users cannot be changed or deleted.',
  'error.SYSTEM_USER_TEXT_TOO_LONG': 'The user text field is too long.',
  'error.SYSTEM_USER_USERNAME_INVALID': 'The username is invalid.',
  'error.SYSTEM_NOTICE_ALREADY_EXISTS': 'The notice already exists.',
  'error.SYSTEM_NOTICE_ARCHIVED_IMMUTABLE':
    'Archived notices cannot be changed.',
  'error.SYSTEM_NOTICE_AUDIENCE_INVALID': 'The notice audience is invalid.',
  'error.SYSTEM_NOTICE_BOOLEAN_INVALID': 'The notice boolean field is invalid.',
  'error.SYSTEM_NOTICE_DATE_INVALID': 'The notice date field is invalid.',
  'error.SYSTEM_NOTICE_DELIVERY_CHANNEL_INVALID':
    'The notice delivery channel is invalid.',
  'error.SYSTEM_NOTICE_DELIVERY_PROVIDER_INVALID':
    'The notice delivery provider is invalid.',
  'error.SYSTEM_NOTICE_DELIVERY_PROVIDER_STATUS_INVALID':
    'The notice delivery provider status is invalid.',
  'error.SYSTEM_NOTICE_DELIVERY_RECIPIENT_INVALID':
    'The notice delivery recipient is invalid.',
  'error.SYSTEM_NOTICE_DELIVERY_STATUS_INVALID':
    'The notice delivery status is invalid.',
  'error.SYSTEM_NOTICE_DISPATCH_STATUS_INVALID':
    'Notices can be dispatched only after publish.',
  'error.SYSTEM_NOTICE_INBOX_NOT_FOUND':
    'The notice does not exist in the inbox.',
  'error.SYSTEM_NOTICE_INTEGRATION_PROVIDER_DISABLED':
    'The notice delivery provider is disabled.',
  'error.SYSTEM_NOTICE_INTEGRATION_PROVIDER_NOT_CONFIGURED':
    'The notice delivery provider is not configured.',
  'error.SYSTEM_NOTICE_INTEGRATION_PROVIDER_TYPE_INVALID':
    'The notice delivery provider type does not match.',
  'error.SYSTEM_NOTICE_NOT_FOUND': 'The notice does not exist.',
  'error.SYSTEM_NOTICE_PUBLISH_STATUS_INVALID':
    'Only draft notices can be published.',
  'error.SYSTEM_NOTICE_RECIPIENT_NOT_FOUND':
    'The notice recipient does not exist or is disabled.',
  'error.SYSTEM_NOTICE_READ_IDS_EMPTY':
    'The notice read ID list must not be empty.',
  'error.SYSTEM_NOTICE_READ_IDS_INVALID':
    'The notice read ID list must be an array.',
  'error.SYSTEM_NOTICE_READ_ID_DUPLICATED': 'The notice read ID is duplicated.',
  'error.SYSTEM_NOTICE_SCHEDULE_INVALID':
    'The notice validity window is invalid.',
  'error.SYSTEM_NOTICE_STATUS_INVALID': 'The notice status is invalid.',
  'error.SYSTEM_NOTICE_TEMPLATE_ALREADY_EXISTS':
    'The notice template already exists.',
  'error.SYSTEM_NOTICE_TEMPLATE_CODE_INVALID':
    'The notice template code is invalid.',
  'error.SYSTEM_NOTICE_TEMPLATE_DISABLED': 'The notice template is disabled.',
  'error.SYSTEM_NOTICE_TEMPLATE_NOT_FOUND':
    'The notice template does not exist.',
  'error.SYSTEM_NOTICE_TEMPLATE_PARAMS_INVALID':
    'The notice template params must be an object.',
  'error.SYSTEM_NOTICE_TEMPLATE_PARAM_MISSING':
    'A required notice template param is missing.',
  'error.SYSTEM_NOTICE_TEMPLATE_PARAM_UNEXPECTED':
    'The notice template contains an unexpected param.',
  'error.SYSTEM_NOTICE_TEMPLATE_PARAM_VALUE_INVALID_TYPE':
    'The notice template param value type is invalid.',
  'error.SYSTEM_NOTICE_TEMPLATE_PARAM_VALUE_REQUIRED':
    'The notice template param value is required.',
  'error.SYSTEM_NOTICE_TEXT_INVALID_TYPE':
    'The notice text field type is invalid.',
  'error.SYSTEM_NOTICE_TEXT_REQUIRED': 'A required notice text field is empty.',
  'error.SYSTEM_NOTICE_TYPE_INVALID': 'The notice type is invalid.',
  'error.SYSTEM_NOTICE_UNREAD_LIMIT_INVALID':
    'The unread notice limit is invalid.',
  'error.INTEGRATION_CONFIG_SECRET_NOT_FOUND':
    'The integration config secret does not exist.',
  'error.INTEGRATION_CONFIG_SECRET_ENV_MISSING':
    'The integration provider environment secret is not configured.',
  'error.INTEGRATION_OAUTH_AUTHORIZATION_URL_INVALID':
    'The OAuth authorization URL is invalid.',
  'error.INTEGRATION_OAUTH_CALLBACK_CODE_REQUIRED':
    'The OAuth callback is missing its authorization code.',
  'error.INTEGRATION_OAUTH_EXPIRES_IN_INVALID':
    'The OAuth token expiration is invalid.',
  'error.INTEGRATION_OAUTH_PROFILE_ACCOUNT_FORBIDDEN':
    'Only the current user can manage this OAuth account binding.',
  'error.INTEGRATION_OAUTH_PROFILE_PROVIDER_NOT_READY':
    'The account binding channel is not ready.',
  'error.INTEGRATION_OAUTH_PROVIDER_DISABLED':
    'The OAuth provider is disabled.',
  'error.INTEGRATION_OAUTH_PROVIDER_MISMATCH':
    'The OAuth callback provider does not match.',
  'error.INTEGRATION_OAUTH_PROVIDER_TYPE_INVALID':
    'The OAuth provider type is invalid.',
  'error.INTEGRATION_OAUTH_REVOKE_REASON_REQUIRED':
    'The OAuth token revoke reason is required.',
  'error.INTEGRATION_OAUTH_REVOKE_REASON_TOO_LONG':
    'The OAuth token revoke reason is too long.',
  'error.INTEGRATION_OAUTH_SCOPES_REQUIRED':
    'The OAuth scope list must not be empty.',
  'error.INTEGRATION_OUTBOX_ALREADY_SENT':
    'Sent outbox messages cannot be marked failed.',
  'error.INTEGRATION_OUTBOX_ATTACHMENT_CONTENT_BASE64_INVALID':
    'The outbox attachment content must be valid base64.',
  'error.INTEGRATION_OUTBOX_ATTACHMENT_CONTENT_TYPE_INVALID':
    'The outbox attachment content type is invalid.',
  'error.INTEGRATION_OUTBOX_ATTACHMENT_FILENAME_INVALID':
    'The outbox attachment file name is invalid.',
  'error.INTEGRATION_OUTBOX_ATTACHMENT_INVALID':
    'The outbox attachment is invalid.',
  'error.INTEGRATION_OUTBOX_ATTACHMENT_SIZE_INVALID':
    'The outbox attachment size is invalid.',
  'error.INTEGRATION_OUTBOX_ATTACHMENTS_INVALID':
    'The outbox attachment list must be an array.',
  'error.INTEGRATION_OUTBOX_ATTACHMENTS_TOO_MANY':
    'The outbox attachment list is too large.',
  'error.INTEGRATION_OUTBOX_ATTACHMENTS_TOTAL_SIZE_TOO_LARGE':
    'The outbox attachment total size is too large.',
  'error.INTEGRATION_OUTBOX_CALLBACK_PROVIDER_MISMATCH':
    'The outbox callback provider does not match.',
  'error.INTEGRATION_OUTBOX_CALLBACK_SIGNATURE_FORMAT_INVALID':
    'The outbox callback signature format is invalid.',
  'error.INTEGRATION_OUTBOX_CALLBACK_SIGNATURE_INVALID':
    'The outbox callback signature is invalid.',
  'error.INTEGRATION_OUTBOX_CALLBACK_STATUS_INVALID':
    'The outbox callback status is invalid.',
  'error.INTEGRATION_OUTBOX_FAILURE_ERROR_REQUIRED':
    'The outbox failure reason is required.',
  'error.INTEGRATION_OUTBOX_FAILURE_ERROR_TOO_LONG':
    'The outbox failure reason is too long.',
  'error.INTEGRATION_OUTBOX_PROCESS_LIMIT_INVALID':
    'The outbox process limit is invalid.',
  'error.INTEGRATION_OUTBOX_PROVIDER_CODE_REQUIRED':
    'The outbox provider code is required.',
  'error.INTEGRATION_OUTBOX_RETRY_STATUS_INVALID':
    'Only failed outbox messages can be retried.',
  'error.INTEGRATION_OUTBOX_SCHEDULE_CHANNEL_INVALID':
    'The outbox schedule channel is invalid.',
  'error.INTEGRATION_OUTBOX_SCHEDULE_CHANNELS_EMPTY':
    'The outbox schedule channel list must not be empty.',
  'error.INTEGRATION_OUTBOX_SCHEDULE_MAX_RETRY_INVALID':
    'The outbox schedule max retry count is invalid.',
  'error.INTEGRATION_OUTBOX_SCHEDULE_RETRY_FAILED_INVALID':
    'The outbox schedule retry flag is invalid.',
  'error.INTEGRATION_OUTBOX_SMS_ATTACHMENTS_UNSUPPORTED':
    'SMS outbox messages do not support attachments.',
  'error.INTEGRATION_OUTBOX_SMS_SUBJECT_UNSUPPORTED':
    'SMS outbox messages do not support subjects.',
  'error.INTEGRATION_OUTBOX_SUBJECT_INVALID_TYPE':
    'The outbox subject must be a string.',
  'error.INTEGRATION_OUTBOX_SUBJECT_TOO_LONG':
    'The outbox subject is too long.',
  'error.INTEGRATION_PROVIDER_DISABLED':
    'The integration provider is disabled.',
  'error.INTEGRATION_PROVIDER_TYPE_MISMATCH':
    'The integration provider type does not match.',
  'error.INTEGRATION_REQUIRED_STRING_MISSING':
    'A required integration text field is empty.',
  'error.INTEGRATION_RESOURCE_NOT_FOUND':
    'The integration resource does not exist.',
  'error.INTEGRATION_SECRET_REF_CONFIG_INVALID':
    'The integration secret ref must use secret://config/<key>.',
  'error.INTEGRATION_SECRET_REF_CONFIG_KEY_REQUIRED':
    'The integration config secret key is required.',
  'error.INTEGRATION_SECRET_REF_INVALID':
    'The integration secret ref is invalid.',
  'error.INTEGRATION_SMS_RECIPIENT_INVALID': 'The SMS recipient is invalid.',
  'error.INTEGRATION_SMS_VERIFICATION_CODE_TOO_SHORT':
    'The SMS verification code is too short.',
  'error.INTEGRATION_TEMPLATE_DISABLED':
    'The integration template is disabled.',
  'error.INTEGRATION_WEBSOCKET_EVENT_TYPE_INVALID':
    'The WebSocket event type is invalid.',
  'error.INTEGRATION_WEBSOCKET_PUBLISH_EVENT_TYPE_INVALID':
    'The WebSocket publish event type is invalid.',
  'error.INTEGRATION_WEBSOCKET_ROOM_INVALID': 'The WebSocket room is invalid.',
  'error.COLLABORATION_MESSAGE_DELETED':
    'The message has already been deleted.',
  'error.COLLABORATION_MESSAGE_NOT_FOUND': 'The message does not exist.',
  'error.COLLABORATION_MESSAGE_READ_STATUS_INVALID':
    'The message cannot be marked read from its current status.',
  'error.COLLABORATION_NOTICE_ARCHIVED':
    'The notice has already been archived.',
  'error.COLLABORATION_NOTICE_PUBLISH_STATUS_INVALID':
    'Only draft notices can be published.',
  'error.COLLABORATION_RESOURCE_NOT_FOUND':
    'The collaboration resource does not exist.',
  'error.COLLABORATION_RESOURCE_NOT_PENDING':
    'The collaboration resource is not pending.',
  'error.COLLABORATION_TODO_STATUS_TERMINAL':
    'The todo is already in a terminal status.',
  'error.SCHEDULER_DISPATCH_NOW_INVALID':
    'The scheduler dispatch time must be a valid ISO date-time.',
  'error.SCHEDULER_HANDLER_NOT_FOUND':
    'The scheduler job handler does not exist.',
  'error.SCHEDULER_JOB_CRON_INVALID':
    'The scheduler job cron expression is invalid.',
  'error.SCHEDULER_JOB_DISABLED': 'The scheduler job is disabled.',
  'error.SCHEDULER_JOB_MANUAL_TRIGGER_FORBIDDEN':
    'The scheduler job does not allow manual trigger.',
  'error.SCHEDULER_JOB_QUEUE_MISMATCH':
    'The scheduler job queue does not match the registry.',
  'error.SCHEDULER_JOB_RETRY_LIMIT_INVALID':
    'The scheduler job retry limit is invalid.',
  'error.SCHEDULER_JOB_TIMEOUT_INVALID':
    'The scheduler job timeout is invalid.',
  'error.SCHEDULER_RESOURCE_NOT_FOUND':
    'The scheduler resource does not exist.',
  'error.SCHEDULER_RUN_CLEAN_STATUS_INVALID':
    'Scheduler run cleanup supports only terminal records.',
  'error.SCHEDULER_RUN_RETENTION_DAYS_INVALID':
    'The scheduler run retention period is invalid.',
  'error.SCHEDULER_WORKER_LIMIT_INVALID':
    'The scheduler worker claim limit is invalid.',
  'error.MONITOR_OPERATIONS_CACHE_CLEAR_CONFIRMATION_REQUIRED':
    'Cache clear requires confirmation.',
  'error.MONITOR_OPERATIONS_CACHE_CLEAR_PREFIX_INVALID':
    'The cache clear prefix must be at least 3 characters.',
  'error.MONITOR_OPERATIONS_CACHE_CLEAR_PREFIX_WILDCARD_INVALID':
    'The cache clear prefix must not contain wildcards.',
  'error.MONITOR_OPERATIONS_CACHE_CLEAR_SCAN_LIMIT_EXCEEDED':
    'Cache clear matched the scan limit. Narrow the prefix.',
  'error.MONITOR_OPERATIONS_CACHE_KEY_DELETE_CONFIRMATION_REQUIRED':
    'Cache key deletion requires confirmation.',
  'error.MONITOR_OPERATIONS_CACHE_KEY_INVALID':
    'The cache key must be at least 3 characters.',
  'error.MONITOR_OPERATIONS_CACHE_KEY_NOT_FOUND':
    'The cache key does not exist.',
  'error.MONITOR_OPERATIONS_CACHE_KEY_SINGLE_LINE_INVALID':
    'The cache key must be a single line.',
  'error.MONITOR_OPERATIONS_RESOURCE_NOT_FOUND':
    'The operations resource does not exist.',
  'error.MONITOR_QUEUE_CONTROL_UNAVAILABLE':
    'Queue control is temporarily unavailable.',
  'error.MONITOR_QUEUE_UNSUPPORTED': 'The monitor queue is not supported.',
  'error.TOOL_AREA_DATASET_DEPTH_TOO_DEEP':
    'The area dataset hierarchy is too deep.',
  'error.TOOL_AREA_DATASET_ENTRIES_INVALID':
    'The area dataset entries must be an array.',
  'error.TOOL_AREA_DATASET_ENTRIES_SIZE_INVALID':
    'The area dataset entry count is outside the allowed range.',
  'error.TOOL_AREA_DATASET_PARENT_CYCLE':
    'The area dataset contains a parent cycle.',
  'error.TOOL_AREA_DATASET_SOURCE_INVALID':
    'The area dataset source is invalid.',
  'error.TOOL_AREA_DATASET_SOURCE_REQUIRED':
    'The area dataset source is required.',
  'error.TOOL_AREA_DATASET_VERSION_INVALID':
    'The area dataset version is invalid.',
  'error.TOOL_AREA_DATASET_VERSION_NOT_FOUND':
    'The area dataset version does not exist.',
  'error.TOOL_AREA_IP_INVALID': 'The IP address is invalid.',
  'error.TOOL_AREA_IP_RANGE_ADDRESS_INVALID':
    'The area IP range address is invalid.',
  'error.TOOL_AREA_IP_RANGE_EMPTY': 'The area IP range must not be empty.',
  'error.TOOL_AREA_IP_RANGE_FORMAT_INVALID':
    'The area IP range must be an IPv4 CIDR or exact IPv4 address.',
  'error.TOOL_AREA_IP_RANGE_PREFIX_INVALID':
    'The area IP range prefix is invalid.',
  'error.TOOL_AREA_REGION_ALIASES_INVALID':
    'The area region aliases must be an array.',
  'error.TOOL_AREA_REGION_ALIASES_TOO_MANY':
    'The area region alias list is too large.',
  'error.TOOL_AREA_REGION_ALIAS_INVALID': 'The area region alias is invalid.',
  'error.TOOL_AREA_REGION_ALIAS_INVALID_TYPE':
    'The area region alias must be a string.',
  'error.TOOL_AREA_REGION_CODE_DUPLICATED':
    'The area region code is duplicated.',
  'error.TOOL_AREA_REGION_CODE_INVALID': 'The area region code is invalid.',
  'error.TOOL_AREA_REGION_CODE_REQUIRED': 'The area region code is required.',
  'error.TOOL_AREA_REGION_IP_RANGES_INVALID':
    'The area region IP ranges must be an array.',
  'error.TOOL_AREA_REGION_IP_RANGES_TOO_MANY':
    'The area region IP range list is too large.',
  'error.TOOL_AREA_REGION_IP_RANGE_INVALID_TYPE':
    'The area region IP range must be a string.',
  'error.TOOL_AREA_REGION_NAME_INVALID': 'The area region name is invalid.',
  'error.TOOL_AREA_REGION_NAME_REQUIRED': 'The area region name is required.',
  'error.TOOL_AREA_REGION_NOT_FOUND': 'The area region does not exist.',
  'error.TOOL_AREA_REGION_PARENT_NOT_FOUND':
    'The area region parent does not exist.',
  'error.TOOL_AREA_REGION_PARENT_SELF':
    'The area region parent cannot be itself.',
  'error.TOOL_OPENFORGE_CONFIG_PATH_INVALID':
    'The OpenForge config path must point to the example config.',
  'error.TOOL_OPENFORGE_DRY_RUN_CONFIRMATION_REQUIRED':
    'The OpenForge dry-run confirmation text is required.',
  'error.TOOL_OPENFORGE_MANIFEST_ID_INVALID':
    'The OpenForge manifest ID is invalid.',
  'error.TOOL_OPENFORGE_REPO_PATH_INVALID':
    'The OpenForge path must be a safe repository-relative path.',
  'error.TOOL_OPENFORGE_SCHEMA_PATH_INVALID':
    'The OpenForge schema path must point to the example schema.',
  'error.TOOL_OPENFORGE_WRITE_MODE_FORBIDDEN':
    'OpenForge API operations allow dry-run only.',
  'error.SYSTEM_CONFIG_ALREADY_EXISTS': 'The config key already exists.',
  'error.SYSTEM_CONFIG_CATEGORY_INVALID_TYPE':
    'The config category must be a string.',
  'error.SYSTEM_CONFIG_CATEGORY_REQUIRED': 'The config category is required.',
  'error.SYSTEM_CONFIG_CATEGORY_TOO_LONG': 'The config category is too long.',
  'error.SYSTEM_CONFIG_ENVIRONMENT_DEFAULT_FORBIDDEN':
    'Environment overrides cannot target the default environment.',
  'error.SYSTEM_CONFIG_ENVIRONMENT_INVALID':
    'The config environment is invalid.',
  'error.SYSTEM_CONFIG_ENVIRONMENT_INVALID_TYPE':
    'The config environment must be a string.',
  'error.SYSTEM_CONFIG_ENVIRONMENT_OVERRIDE_NOT_FOUND':
    'The config environment override does not exist.',
  'error.SYSTEM_CONFIG_ENVIRONMENT_OVERRIDE_VISIBILITY_INVALID':
    'Only public config can define environment overrides.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_ATTRIBUTE_INVALID':
    'The feature audience attribute is invalid.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_ATTRIBUTE_INVALID_TYPE':
    'The feature audience attribute must be a string.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_ENABLED_MISSING':
    'The feature audience config is missing its enabled flag.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_INVALID':
    'The feature audience rules must be a JSON object.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_MODE_INVALID':
    'The feature audience match mode is invalid.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_OPERATOR_INVALID':
    'The feature audience operator is invalid.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_RULES_INVALID':
    'The feature audience rules must be an array.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_RULES_TOO_MANY':
    'The feature audience has too many rules.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_RULE_INVALID':
    'The feature audience rule must be an object.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_VALUES_INVALID':
    'The feature audience values are invalid.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_VALUE_DUPLICATED':
    'The feature audience value is duplicated.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_VALUE_INVALID':
    'The feature audience value is invalid.',
  'error.SYSTEM_CONFIG_FEATURE_AUDIENCE_VALUE_INVALID_TYPE':
    'The feature audience value must be a string.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_NAME_INVALID':
    'The feature flag name is invalid.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_NAME_INVALID_TYPE':
    'The feature flag name must be a string.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_NOT_FOUND':
    'The feature flag does not exist.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_ROLLOUT_INVALID':
    'The feature flag rollout must be an integer between 0 and 100.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_RUNTIME_SHAPE_INVALID':
    'The feature flag runtime config shape is invalid.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTES_INVALID_TYPE':
    'The feature flag subject attributes must be a JSON object string.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTES_JSON_INVALID':
    'The feature flag subject attributes must be valid JSON.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTES_OBJECT_INVALID':
    'The feature flag subject attributes must be a JSON object.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTES_TOO_MANY':
    'The feature flag subject has too many attributes.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTE_KEY_INVALID':
    'The feature flag subject attribute key is invalid.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTE_VALUE_INVALID':
    'The feature flag subject attribute value is invalid.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTE_VALUE_INVALID_TYPE':
    'The feature flag subject attribute value type is invalid.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_KEY_INVALID_TYPE':
    'The feature flag subject key must be a string.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_KEY_REQUIRED':
    'The feature flag subject key is required.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_KEY_TOO_LONG':
    'The feature flag subject key is too long.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_VALUE_TYPE_INVALID':
    'The feature flag config value type is invalid.',
  'error.SYSTEM_CONFIG_FEATURE_FLAG_VISIBILITY_INVALID':
    'The feature flag config must remain public.',
  'error.SYSTEM_CONFIG_FEATURE_ROLLOUT_ENABLED_MISSING':
    'The feature rollout config is missing its enabled flag.',
  'error.SYSTEM_CONFIG_KEYS_EMPTY': 'The config key list must not be empty.',
  'error.SYSTEM_CONFIG_KEYS_INVALID': 'The config key list must be an array.',
  'error.SYSTEM_CONFIG_KEY_DUPLICATED': 'The config key is duplicated.',
  'error.SYSTEM_CONFIG_KEY_INVALID_TYPE': 'The config key must be a string.',
  'error.SYSTEM_CONFIG_KEY_REQUIRED': 'The config key is required.',
  'error.SYSTEM_CONFIG_KMS_NOT_READY':
    'The config key management service is not ready.',
  'error.SYSTEM_CONFIG_NAME_INVALID_TYPE': 'The config name must be a string.',
  'error.SYSTEM_CONFIG_NAME_REQUIRED': 'The config name is required.',
  'error.SYSTEM_CONFIG_NAME_TOO_LONG': 'The config name is too long.',
  'error.SYSTEM_CONFIG_NOT_FOUND': 'The config does not exist.',
  'error.SYSTEM_CONFIG_NOT_SECRET': 'The config is not a secret config.',
  'error.SYSTEM_CONFIG_RUNTIME_INTEGER_INVALID':
    'The runtime config value must be an integer in the allowed range.',
  'error.SYSTEM_CONFIG_RUNTIME_VALUE_TYPE_INVALID':
    'The runtime config value type is invalid.',
  'error.SYSTEM_CONFIG_RUNTIME_VISIBILITY_INVALID':
    'The runtime config must remain public.',
  'error.SYSTEM_CONFIG_SECRET_KEY_VISIBILITY_REQUIRED':
    'Secret-like config keys must be explicitly marked as secret.',
  'error.SYSTEM_CONFIG_SECRET_ROTATION_ACTOR_INVALID_TYPE':
    'The secret rotation actor must be a string.',
  'error.SYSTEM_CONFIG_SECRET_ROTATION_ACTOR_TOO_LONG':
    'The secret rotation actor is too long.',
  'error.SYSTEM_CONFIG_SECRET_ROTATION_VALUE_INVALID_TYPE':
    'The secret rotation value must be a string.',
  'error.SYSTEM_CONFIG_SECRET_ROTATION_VALUE_REQUIRED':
    'The secret rotation value is required.',
  'error.SYSTEM_CONFIG_SECRET_VALUE_TYPE_INVALID':
    'Secret config values must keep string value type.',
  'error.SYSTEM_CONFIG_SECRET_VERSION_VISIBILITY_INVALID':
    'Only secret config can keep secret versions.',
  'error.SYSTEM_CONFIG_SECRET_VISIBILITY_KEY_REQUIRED':
    'Secret visibility requires a secret-like config key.',
  'error.SYSTEM_CONFIG_SYSTEM_IMMUTABLE':
    'Built-in system config cannot be deleted.',
  'error.SYSTEM_CONFIG_TEXT_INVALID_TYPE':
    'The config text field must be a string.',
  'error.SYSTEM_CONFIG_TEXT_TOO_LONG': 'The config text field is too long.',
  'error.SYSTEM_CONFIG_VALUE_BOOLEAN_INVALID':
    'The boolean config value is invalid.',
  'error.SYSTEM_CONFIG_VALUE_INVALID_TYPE':
    'The config value must be a string.',
  'error.SYSTEM_CONFIG_VALUE_JSON_INVALID': 'The JSON config value is invalid.',
  'error.SYSTEM_CONFIG_VALUE_NOT_PUBLIC': 'The config value is not public.',
  'error.SYSTEM_CONFIG_VALUE_NUMBER_INVALID':
    'The number config value is invalid.',
  'error.SYSTEM_CONFIG_VAULT_ACTIVE_KEY_MISSING':
    'The config keyring is missing the active key.',
  'error.SYSTEM_CONFIG_VAULT_DECRYPT_FAILED':
    'The config secret value could not be decrypted.',
  'error.SYSTEM_CONFIG_VAULT_KEYRING_INVALID':
    'The config keyring format is invalid.',
  'error.SYSTEM_CONFIG_VAULT_KEY_ID_INVALID':
    'The config vault key ID is invalid.',
  'error.SYSTEM_CONFIG_VAULT_KEY_MATERIAL_INVALID':
    'The config vault key material is invalid.',
  'error.SYSTEM_CONFIG_VAULT_KEY_NOT_CONFIGURED':
    'The config vault key is not configured.',
  'error.SYSTEM_ROLE_ALREADY_EXISTS': 'The role code already exists.',
  'error.SYSTEM_ROLE_BOOLEAN_INVALID':
    'The role boolean field must be a boolean.',
  'error.SYSTEM_ROLE_CANNOT_DELETE_SYSTEM':
    'Built-in system roles cannot be deleted.',
  'error.SYSTEM_ROLE_CANNOT_DISABLE_SYSTEM':
    'Built-in system roles cannot be disabled.',
  'error.SYSTEM_ROLE_CODE_INVALID': 'The role code is invalid.',
  'error.SYSTEM_ROLE_CUSTOM_DATA_SCOPE_DEPT_REQUIRED':
    'Custom data scope requires at least one department.',
  'error.SYSTEM_ROLE_DATA_SCOPE_DEPT_ID_DUPLICATED':
    'The role data-scope department is duplicated.',
  'error.SYSTEM_ROLE_DATA_SCOPE_INVALID': 'The role data scope is invalid.',
  'error.SYSTEM_ROLE_DEPT_NOT_FOUND':
    'The role data-scope department does not exist.',
  'error.SYSTEM_ROLE_FIELD_REQUIRED': 'A required role field is missing.',
  'error.SYSTEM_ROLE_MENU_KEY_DUPLICATED': 'The role menu key is duplicated.',
  'error.SYSTEM_ROLE_MENU_KEY_INVALID_TYPE':
    'The role menu key must be a string.',
  'error.SYSTEM_ROLE_MENU_KEY_REQUIRED': 'The role menu key is required.',
  'error.SYSTEM_ROLE_MENU_KEYS_INVALID':
    'The role menu key list must be an array.',
  'error.SYSTEM_ROLE_MENU_NOT_FOUND': 'The role menu does not exist.',
  'error.SYSTEM_ROLE_NOT_FOUND': 'The role does not exist.',
  'error.SYSTEM_ROLE_PERMISSION_CODE_DUPLICATED':
    'The role permission code is duplicated.',
  'error.SYSTEM_ROLE_PERMISSION_NOT_FOUND':
    'The role permission does not exist.',
  'error.SYSTEM_MENU_ALREADY_EXISTS': 'The menu key already exists.',
  'error.SYSTEM_MENU_FIELD_REQUIRED': 'A required menu field is missing.',
  'error.SYSTEM_MENU_HAS_CHILDREN':
    'The menu has child menus and cannot be deleted.',
  'error.SYSTEM_MENU_KEY_INVALID': 'The menu key is invalid.',
  'error.SYSTEM_MENU_NOT_FOUND': 'The menu does not exist.',
  'error.SYSTEM_MENU_ORDER_INVALID':
    'The menu order must be a non-negative integer.',
  'error.SYSTEM_MENU_ORDER_REQUIRED': 'The menu order is required.',
  'error.SYSTEM_MENU_PARENT_CYCLE': 'The menu parent would create a cycle.',
  'error.SYSTEM_MENU_PARENT_NOT_FOUND': 'The parent menu does not exist.',
  'error.SYSTEM_MENU_PARENT_SELF': 'The menu parent cannot be itself.',
  'error.SYSTEM_MENU_PATH_INVALID': 'The menu path must start with /.',
  'error.SYSTEM_MENU_PERMISSION_NOT_FOUND':
    'The menu permission does not exist.',
  'error.SYSTEM_MENU_STATUS_INVALID': 'The menu status is invalid.',
  'error.SYSTEM_MENU_TYPE_INVALID': 'The menu type is invalid.',
  'error.SYSTEM_POST_ALREADY_EXISTS': 'The post code already exists.',
  'error.SYSTEM_POST_CODE_DUPLICATED': 'The post code is duplicated.',
  'error.SYSTEM_POST_CODE_INVALID': 'The post code is invalid.',
  'error.SYSTEM_POST_CODE_INVALID_TYPE': 'The post code must be a string.',
  'error.SYSTEM_POST_CODES_EMPTY': 'The post code list must not be empty.',
  'error.SYSTEM_POST_CODES_INVALID': 'The post code list must be an array.',
  'error.SYSTEM_POST_ENABLED_FILTER_INVALID':
    'The post enabled filter is invalid.',
  'error.SYSTEM_POST_FIELD_REQUIRED': 'A required post field is missing.',
  'error.SYSTEM_POST_NOT_FOUND': 'The post does not exist.',
  'error.SYSTEM_POST_ORDER_INVALID':
    'The post order must be a non-negative integer.',
  'error.SYSTEM_POST_ORDER_ITEM_CODE_DUPLICATED':
    'The post order item code is duplicated.',
  'error.SYSTEM_POST_ORDER_ITEM_INVALID':
    'The post order item must be an object.',
  'error.SYSTEM_POST_ORDER_ITEMS_INVALID':
    'Post order updates require at least one item.',
  'error.SYSTEM_DEPT_ALREADY_EXISTS': 'The department code already exists.',
  'error.SYSTEM_DEPT_CODE_INVALID': 'The department code is invalid.',
  'error.SYSTEM_DEPT_ENABLED_FILTER_INVALID':
    'The department enabled filter is invalid.',
  'error.SYSTEM_DEPT_FIELD_REQUIRED': 'A required department field is missing.',
  'error.SYSTEM_DEPT_HAS_CHILDREN':
    'The department has child departments and cannot be deleted.',
  'error.SYSTEM_DEPT_HAS_USERS':
    'The department has assigned users and cannot be deleted.',
  'error.SYSTEM_DEPT_NOT_FOUND': 'The department does not exist.',
  'error.SYSTEM_DEPT_ORDER_INVALID':
    'The department order must be a non-negative integer.',
  'error.SYSTEM_DEPT_ORDER_ITEM_ID_DUPLICATED':
    'The department order item ID is duplicated.',
  'error.SYSTEM_DEPT_ORDER_ITEM_INVALID':
    'The department order item must be an object.',
  'error.SYSTEM_DEPT_ORDER_ITEMS_INVALID':
    'Department order updates require at least one item.',
  'error.SYSTEM_DEPT_PARENT_DESCENDANT':
    'The department parent cannot be one of its descendants.',
  'error.SYSTEM_DEPT_PARENT_SELF': 'The department parent cannot be itself.',
  'error.SYSTEM_DEPT_SIBLING_PARENT_MISMATCH':
    'Department sibling ordering requires the same parent.',
  'error.SYSTEM_DICT_ALREADY_EXISTS': 'The dictionary code already exists.',
  'error.SYSTEM_DICT_BOOLEAN_INVALID':
    'The dictionary boolean field must be a boolean.',
  'error.SYSTEM_DICT_CODES_EMPTY':
    'The dictionary code list must not be empty.',
  'error.SYSTEM_DICT_CODES_INVALID':
    'The dictionary code list must be an array.',
  'error.SYSTEM_DICT_CODE_DUPLICATED': 'The dictionary code is duplicated.',
  'error.SYSTEM_DICT_CODE_INVALID': 'The dictionary code is invalid.',
  'error.SYSTEM_DICT_DATE_INVALID': 'The dictionary date filter is invalid.',
  'error.SYSTEM_DICT_HAS_ITEMS':
    'The dictionary has items and cannot be deleted directly.',
  'error.SYSTEM_DICT_IMPORT_BOOLEAN_INVALID':
    'The dictionary import boolean value is invalid.',
  'error.SYSTEM_DICT_IMPORT_COLUMN_MISSING':
    'The dictionary import file is missing a required column.',
  'error.SYSTEM_DICT_IMPORT_CONTENT_BASE64_INVALID':
    'The dictionary import content must be valid base64.',
  'error.SYSTEM_DICT_IMPORT_CONTENT_EMPTY':
    'The dictionary import content must not be empty.',
  'error.SYSTEM_DICT_IMPORT_CONTENT_TOO_LARGE':
    'The dictionary import file is too large.',
  'error.SYSTEM_DICT_IMPORT_CSV_UNCLOSED_QUOTE':
    'The dictionary import CSV has an unclosed quote.',
  'error.SYSTEM_DICT_IMPORT_DATA_ROW_REQUIRED':
    'The dictionary import file requires at least one non-empty data row.',
  'error.SYSTEM_DICT_IMPORT_INTEGER_INVALID':
    'The dictionary import integer field is invalid.',
  'error.SYSTEM_DICT_IMPORT_ITEM_PAIR_INVALID':
    'The dictionary import item value and label must be provided together.',
  'error.SYSTEM_DICT_IMPORT_ROWS_REQUIRED':
    'The dictionary import file must contain a header and at least one data row.',
  'error.SYSTEM_DICT_IMPORT_XLSX_INVALID':
    'The dictionary import XLSX must be a valid workbook.',
  'error.SYSTEM_DICT_IMPORT_XLSX_SHEET_MISSING':
    'The dictionary import XLSX is missing its worksheet.',
  'error.SYSTEM_DICT_INLINE_ITEMS_UPDATE_UNSUPPORTED':
    'Dictionary items must be managed through dictionary item APIs.',
  'error.SYSTEM_DICT_INTEGER_INVALID':
    'The dictionary integer field is invalid.',
  'error.SYSTEM_DICT_ITEM_ALREADY_EXISTS':
    'The dictionary item value already exists.',
  'error.SYSTEM_DICT_ITEM_IDS_EMPTY':
    'The dictionary item ID list must not be empty.',
  'error.SYSTEM_DICT_ITEM_IDS_INVALID':
    'The dictionary item ID list must be an array.',
  'error.SYSTEM_DICT_ITEM_ID_DUPLICATED':
    'The dictionary item ID is duplicated.',
  'error.SYSTEM_DICT_ITEM_NOT_FOUND': 'The dictionary item does not exist.',
  'error.SYSTEM_DICT_NOT_FOUND': 'The dictionary does not exist.',
  'error.SYSTEM_DICT_PARENT_DELETED':
    'Restore the dictionary before restoring this dictionary item.',
  'error.SYSTEM_DICT_SYSTEM_IMMUTABLE':
    'The built-in system dictionary cannot perform this action.',
  'error.SYSTEM_DICT_SYSTEM_ITEM_IMMUTABLE':
    'The built-in system dictionary item cannot perform this action.',
  'error.SYSTEM_DICT_TEXT_REQUIRED': 'A required dictionary text is missing.',
  'error.SYSTEM_DICT_TRANSLATION_ENTRIES_EMPTY':
    'Dictionary translation entries must not be empty.',
  'error.SYSTEM_DICT_TRANSLATION_ENTRIES_INVALID':
    'Dictionary translation entries must be an array.',
  'error.SYSTEM_DICT_TRANSLATION_VALUES_INVALID':
    'Dictionary translation values must be an array.',
  'error.SYSTEM_DICT_TRANSLATION_VALUE_DUPLICATED':
    'The dictionary translation value is duplicated.',
  'error.TOOL_AREA_FORMAT_SEPARATOR_INVALID':
    'The area path separator is invalid.',
  'error.TOOL_AREA_LEVEL_INVALID': 'The area level is invalid.',
};

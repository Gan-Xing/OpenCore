export default {
  'error.AUTH_INVALID_CREDENTIALS': 'Invalid username or password.',
  'error.AUTH_USER_UNAVAILABLE': 'The user is disabled or does not exist.',
  'error.AUTH_BEARER_TOKEN_MISSING': 'Please sign in first.',
  'error.AUTH_BEARER_TOKEN_INVALID':
    'The sign-in credential is invalid. Please sign in again.',
  'error.AUTH_BEARER_TOKEN_INVALID_PAYLOAD':
    'The sign-in credential is invalid. Please sign in again.',
  'error.AUTH_BEARER_TOKEN_EXPIRED':
    'The sign-in credential has expired. Please sign in again.',
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
  'error.FILE_MIME_TYPE_INVALID': 'The file MIME type is invalid.',
  'error.FILE_NAME_INVALID': 'The file name must be a plain file name.',
  'error.FILE_OBJECT_PREFIX_INVALID':
    'The object prefix must be a relative prefix.',
  'error.FILE_OBJECT_PREFIX_RESERVED':
    'The object prefix cannot reuse a reserved prefix.',
  'error.FILE_SIZE_INVALID': 'The file size must be positive.',
  'error.FILE_STORAGE_KEY_INVALID':
    'The storage object key must be a relative path.',
  'error.BAD_REQUEST': 'The request is invalid.',
  'error.VALIDATION_FAILED': 'The submitted content failed validation.',
  'error.NOT_FOUND': 'The requested resource does not exist.',
  'error.CONFLICT': 'The current data state conflicts. Refresh and try again.',
  'error.HTTP_400': 'The request is invalid.',
  'error.HTTP_401': 'Your session has expired. Please sign in again.',
  'error.HTTP_403': 'Your account does not have access.',
  'error.HTTP_404': 'The requested resource does not exist.',
  'error.HTTP_409': 'The current data state conflicts. Refresh and try again.',
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
  'error.USER_AVATAR_CONTENT_INVALID_BASE64':
    'The avatar content must be valid base64.',
  'error.USER_AVATAR_CONTENT_INVALID_TYPE':
    'The avatar content must be a string.',
  'error.USER_AVATAR_MIME_TYPE_INVALID_TYPE':
    'The avatar MIME type must be a string.',
  'error.USER_AVATAR_MIME_TYPE_UNSUPPORTED':
    'The avatar MIME type must be PNG, JPEG, WebP, or GIF.',
  'error.USER_AVATAR_NOT_FOUND': 'The user avatar does not exist.',
  'error.USER_AVATAR_ORIGINAL_NAME_INVALID':
    'The avatar file name must be a plain file name.',
  'error.USER_AVATAR_ORIGINAL_NAME_INVALID_TYPE':
    'The avatar file name must be a string.',
  'error.USER_AVATAR_TOO_LARGE': 'The avatar file is too large.',
  'error.SYSTEM_ROLE_USER_IDS_INVALID':
    'The role user list must be an array.',
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
  'error.SYSTEM_USER_DEPT_NOT_FOUND': 'The user department does not exist.',
  'error.SYSTEM_USER_ENABLED_INVALID':
    'The user enabled field must be a boolean.',
  'error.SYSTEM_USER_FIELD_INVALID_TYPE': 'The user field type is invalid.',
  'error.SYSTEM_USER_FIELD_REQUIRED': 'A required user field is missing.',
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
  'error.SYSTEM_USER_NOT_FOUND': 'The user does not exist.',
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
  'error.SYSTEM_USER_USERNAME_INVALID': 'The username is invalid.',
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
  'error.SYSTEM_DICT_INTEGER_INVALID':
    'The dictionary integer field is invalid.',
  'error.SYSTEM_DICT_ITEM_ALREADY_EXISTS':
    'The dictionary item value already exists.',
  'error.SYSTEM_DICT_ITEM_NOT_FOUND': 'The dictionary item does not exist.',
  'error.SYSTEM_DICT_NOT_FOUND': 'The dictionary does not exist.',
  'error.SYSTEM_DICT_TEXT_REQUIRED': 'A required dictionary text is missing.',
};

UPDATE "SystemConfig"
SET
  "public" = true,
  "description" = 'Public login lockout runtime setting.',
  "remark" = 'Shown on the Admin login page as a runtime login policy.'
WHERE "key" = 'auth.login.lockoutMinutes';

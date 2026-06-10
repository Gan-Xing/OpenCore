type InitialState = {
  permissions?: string[];
};

export default (initialState: InitialState = {}) => {
  // S2 only keeps the access extension point. Real RBAC is intentionally deferred.
  const permissions = new Set(initialState.permissions ?? []);
  return {
    canReadHealth: permissions.has('core:health:read'),
  };
};

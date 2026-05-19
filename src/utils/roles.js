const normalizeRoleValue = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const getUserRoles = (user) => {
  if (!user || typeof user !== 'object') return [];

  const roles = Array.isArray(user.roles)
    ? user.roles.map(normalizeRoleValue).filter(Boolean)
    : [];
  const primaryRole = normalizeRoleValue(user.role);

  if (primaryRole && !roles.includes(primaryRole)) {
    roles.push(primaryRole);
  }

  return roles;
};

const hasRole = (user, requiredRole) => {
  const normalizedRequiredRole = normalizeRoleValue(requiredRole);
  if (!normalizedRequiredRole) return false;
  return getUserRoles(user).includes(normalizedRequiredRole);
};

const getPrimaryRole = (user, fallback = '') => {
  const roles = getUserRoles(user);
  return roles[0] || fallback;
};

module.exports = {
  getUserRoles,
  hasRole,
  getPrimaryRole,
};

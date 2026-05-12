const MODULE_KEYS = ['users', 'structures', 'reports', 'admin'];
const ACCESS_ACTIONS = ['read', 'write'];

const createModulePermission = (read = false, write = false) => ({
  read,
  write
});

const getDefaultModulePermissions = (role = 'FE') => {
  const normalizedRole = String(role || 'FE').toUpperCase();

  if (normalizedRole === 'AD') {
    return {
      users: createModulePermission(true, true),
      structures: createModulePermission(true, true),
      reports: createModulePermission(true, true),
      admin: createModulePermission(true, true)
    };
  }

  if (normalizedRole === 'VE' || normalizedRole === 'TE') {
    return {
      users: createModulePermission(false, false),
      structures: createModulePermission(true, true),
      reports: createModulePermission(true, true),
      admin: createModulePermission(true, false)
    };
  }

  return {
    users: createModulePermission(false, false),
    structures: createModulePermission(true, true),
    reports: createModulePermission(true, true),
    admin: createModulePermission(false, false)
  };
};

const getDefaultLegacyPermissions = (role = 'FE') => {
  const normalizedRole = String(role || 'FE').toUpperCase();
  const isPrivileged = ['AD', 'VE', 'TE'].includes(normalizedRole);

  return {
    can_create_structures: true,
    can_approve_structures: normalizedRole === 'AD' || normalizedRole === 'VE',
    can_delete_structures: normalizedRole === 'AD',
    can_view_all_structures: isPrivileged,
    can_export_reports: true,
    can_manage_users: normalizedRole === 'AD'
  };
};

const normalizeModulePermissions = (input, role = 'FE') => {
  const defaults = getDefaultModulePermissions(role);
  const source = input && typeof input === 'object' ? input : {};

  return MODULE_KEYS.reduce((acc, moduleKey) => {
    const candidate = source[moduleKey] && typeof source[moduleKey] === 'object'
      ? source[moduleKey]
      : {};

    acc[moduleKey] = {
      read: typeof candidate.read === 'boolean' ? candidate.read : defaults[moduleKey].read,
      write: typeof candidate.write === 'boolean' ? candidate.write : defaults[moduleKey].write
    };
    return acc;
  }, {});
};

const normalizePermissions = (input, role = 'FE') => {
  const defaults = getDefaultLegacyPermissions(role);
  const source = input && typeof input === 'object' ? input : {};

  return {
    can_create_structures:
      typeof source.can_create_structures === 'boolean'
        ? source.can_create_structures
        : defaults.can_create_structures,
    can_approve_structures:
      typeof source.can_approve_structures === 'boolean'
        ? source.can_approve_structures
        : defaults.can_approve_structures,
    can_delete_structures:
      typeof source.can_delete_structures === 'boolean'
        ? source.can_delete_structures
        : defaults.can_delete_structures,
    can_view_all_structures:
      typeof source.can_view_all_structures === 'boolean'
        ? source.can_view_all_structures
        : defaults.can_view_all_structures,
    can_export_reports:
      typeof source.can_export_reports === 'boolean'
        ? source.can_export_reports
        : defaults.can_export_reports,
    can_manage_users:
      typeof source.can_manage_users === 'boolean'
        ? source.can_manage_users
        : defaults.can_manage_users,
    modules: normalizeModulePermissions(source.modules, role)
  };
};

const hasModulePermission = (permissions, moduleKey, action) => {
  if (!MODULE_KEYS.includes(moduleKey) || !ACCESS_ACTIONS.includes(action)) {
    return false;
  }

  return Boolean(permissions?.modules?.[moduleKey]?.[action]);
};

module.exports = {
  MODULE_KEYS,
  ACCESS_ACTIONS,
  getDefaultModulePermissions,
  getDefaultLegacyPermissions,
  normalizeModulePermissions,
  normalizePermissions,
  hasModulePermission
};

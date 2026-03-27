export const ROLE_TO_PATH = {
  enumerator: '/audit/new',
  supervisor: '/supervisor',
  project_manager: '/admin',
  client_executive: '/executive',
};

export function resolveLandingPath(role) {
  return ROLE_TO_PATH[role] || '/login';
}

export const ROUTE_ROLE_RULES = [
  { path: '/audit/new', roles: ['enumerator'] },
  { path: '/supervisor', roles: ['supervisor'] },
  { path: '/admin', roles: ['project_manager'] },
  { path: '/admin/questionnaire', roles: ['project_manager'] },
  { path: '/admin/escalations', roles: ['project_manager', 'supervisor'] },
  { path: '/executive', roles: ['client_executive'] },
  { path: '/map', roles: ['supervisor', 'project_manager', 'client_executive'] },
  { path: '/outlets/', roles: ['supervisor', 'project_manager'] },
];

export function canAccessPath(role, pathName) {
  if (!role || !pathName) {
    return false;
  }

  const normalizedPath = pathName.toLowerCase();

  const matchedRule = ROUTE_ROLE_RULES.find((rule) => {
    if (rule.path.endsWith('/')) {
      return normalizedPath.startsWith(rule.path);
    }

    return normalizedPath === rule.path;
  });

  if (!matchedRule) {
    return true;
  }

  return matchedRule.roles.includes(role);
}

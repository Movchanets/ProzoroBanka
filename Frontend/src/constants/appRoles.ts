export const AppRoles = {
  Volunteer: 'Volunteer',
  Accountant: 'Accountant',
  Admin: 'Admin',
} as const;

export type AppRole = (typeof AppRoles)[keyof typeof AppRoles];

export function hasAppRole(roles: string[] | undefined | null, expectedRole: AppRole): boolean {
  if (!roles?.length) {
    return false;
  }

  return roles.some((role) => role.trim().toLowerCase() === expectedRole.toLowerCase());
}

export function getSystemRoleLabelKey(role: string): string {
  const normalized = role.trim().toLowerCase();

  if (normalized === AppRoles.Admin.toLowerCase()) {
    return 'systemRoles.admin';
  }

  if (normalized === AppRoles.Accountant.toLowerCase()) {
    return 'systemRoles.accountant';
  }

  if (normalized === AppRoles.Volunteer.toLowerCase()) {
    return 'systemRoles.volunteer';
  }

  return role;
}
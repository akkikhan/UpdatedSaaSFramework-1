export function assignRole(user, role) {
  if (!user.roles) user.roles = [];
  if (!user.roles.includes(role)) user.roles.push(role);
  return user;
}

export function filterRevokedRoles(userRoles, revoked) {
  return userRoles.filter((r) => !revoked.includes(r));
}

const roleRank = Object.freeze({
  viewer: 0,
  member: 1,
  employee: 1,
  manager: 2,
  admin: 3,
  owner: 4,
});

function hasMinimumRole(role, minimumRole) {
  return Object.hasOwn(roleRank, role) &&
    Object.hasOwn(roleRank, minimumRole) &&
    roleRank[role] >= roleRank[minimumRole];
}

function isManagerOrHigher(role) {
  return hasMinimumRole(role, "manager");
}

module.exports = { hasMinimumRole, isManagerOrHigher, roleRank };

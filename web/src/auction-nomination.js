export const ROLE_ORDER = ["P", "D", "C", "A"];

export const isRoleNomination = (policy) =>
  ["call_by_role", "random_by_role", "alphabetical_by_role"].includes(policy);

/** The phase changes only after the entire league has filled that role. */
export const activeNominationRole = (teams, rules) => {
  if (!isRoleNomination(rules.auction.nomination)) return null;
  return ROLE_ORDER.find((role) =>
    teams.some((team) =>
      (team.roster || []).filter((player) => player.ruolo === role).length <
      rules.rosterSlots[role],
    ),
  ) || null;
};

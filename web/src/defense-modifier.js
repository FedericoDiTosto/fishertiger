const tierThreshold = (tier) => Number(tier?.minimum_average ?? tier?.min ?? tier?.threshold ?? tier?.media);
const tierBonus = (tier) => Number(tier?.bonus ?? tier?.points ?? 0);

/**
 * Compute the configured defensive modifier from pure votes only.
 * A valid lineup needs a goalkeeper vote and the configured number of defenders.
 */
export const defenseModifierBonus = ({ goalkeeperVote, defenderVotes, enabled = false, requiredDefenders = 4, tiers = [] } = {}) => {
  if (!enabled || !Number.isFinite(Number(goalkeeperVote)) || !Array.isArray(defenderVotes) || defenderVotes.length < requiredDefenders) return 0;
  const bestThree = defenderVotes
    .map(Number)
    .filter(Number.isFinite)
    .sort((left, right) => right - left)
    .slice(0, 3);
  if (bestThree.length !== 3) return 0;
  const average = (Number(goalkeeperVote) + bestThree.reduce((total, vote) => total + vote, 0)) / 4;
  return tiers.reduce((bonus, tier) => (average >= tierThreshold(tier) ? tierBonus(tier) : bonus), 0);
};

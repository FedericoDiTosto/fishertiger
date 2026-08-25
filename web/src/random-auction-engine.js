import { normalizeRules } from "./league-rules.js";
import { ROLE_ORDER, isRoleNomination } from "./auction-nomination.js";

const hashSeed = (seed) => {
  const text = String(seed ?? 1);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRandom = (seed) => {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const creditsForTeams = (startingCredits, teamCount, rosterSize) => {
  const supplied = startingCredits;
  const credits = Array.isArray(supplied)
    ? supplied.slice()
    : Array(teamCount).fill(supplied);

  if (
    credits.length !== teamCount ||
    credits.some((credit) => !Number.isInteger(credit) || credit < rosterSize)
  ) {
    throw new RangeError(
      `startingCredits must be an integer of at least ${rosterSize}, or an array of ${teamCount} such integers`,
    );
  }
  return credits;
};

/**
 * Generate a complete eight-team auction using only the supplied player pool.
 * Owners and nominators are zero-based team indexes; callNumber is one-based.
 */
export const generateRandomAuction = (players, options = {}) => {
  if (!Array.isArray(players)) throw new TypeError("players must be an array");
  const rules = normalizeRules(options.rules);
  const slots = rules.rosterSlots;
  const roles = ROLE_ORDER.filter((role) => slots[role] != null);
  const teamCount = rules.participants;
  const rosterSize = Object.values(slots).reduce((sum, count) => sum + count, 0);
  const { minPrice, increment, reserve, nomination } = rules.auction;

  const pools = Object.fromEntries(roles.map((role) => [role, []]));
  const seenIds = new Set();
  for (const player of players) {
    if (!roles.includes(player?.ruolo)) continue;
    if (player.id == null)
      throw new TypeError("every eligible player needs an id");
    const key = `${typeof player.id}:${String(player.id)}`;
    if (seenIds.has(key))
      throw new RangeError(`duplicate player id: ${player.id}`);
    seenIds.add(key);
    pools[player.ruolo].push(player);
  }

  for (const role of roles) {
    const required = teamCount * slots[role];
    if (pools[role].length < required) {
      throw new RangeError(
        `not enough ${role} players: ${pools[role].length} supplied, ${required} required`,
      );
    }
  }

  const random = seededRandom(options.seed);
  const initialCredits = creditsForTeams(options.startingCredits ?? rules.startingCredits, teamCount, rosterSize);
  const credits = initialCredits.slice();
  const needs = Array.from({ length: teamCount }, () => ({ ...slots }));
  const events = [];
  const playerOrder = (left, right) =>
    String(left.nome_norm ?? left.nome ?? "").localeCompare(
      String(right.nome_norm ?? right.nome ?? ""),
      "it",
      { sensitivity: "base" },
    ) || String(left.id).localeCompare(String(right.id), "it", { numeric: true });

  for (let call = 1; call <= teamCount * rosterSize; call++) {
    const roleMode = isRoleNomination(nomination);
    const activeRole = roleMode
      ? roles.find((role) => needs.some((team) => team[role] > 0))
      : null;
    const eligible = (activeRole ? pools[activeRole] : roles.flatMap((role) => pools[role]))
      .filter((player) => needs.some((team) => team[player.ruolo] > 0));
    let player;
    if (
      nomination === "call" ||
      nomination === "call_by_role" ||
      nomination === "random" ||
      nomination === "random_by_role"
    ) {
      player = eligible[Math.floor(random() * eligible.length)];
    } else if (nomination === "alphabetical" || nomination === "alphabetical_by_role") {
      player = eligible.slice().sort(playerOrder)[0];
    }
    const role = player.ruolo;
    pools[role].splice(pools[role].indexOf(player), 1);
    const nominator = nomination === "random" || nomination === "random_by_role"
      ? Math.floor(random() * teamCount)
      : (call - 1) % teamCount;
    const fvm = Math.max(1, Number(player.fvm_scaled) || 1);

    const bids = needs
      .map((teamNeeds, owner) => {
        if (!teamNeeds[role]) return null;
        const slotsOpen = roles.reduce(
          (sum, candidateRole) => sum + teamNeeds[candidateRole],
          0,
        );
        const legalMax = credits[owner] - reserve * (slotsOpen - 1);
        const needPressure = 0.9 + 0.2 * (teamNeeds[role] / slots[role]);
        const budgetScale = initialCredits[owner] / Number(rules.startingCredits || 500);
        const estimate = Math.round(
          fvm * budgetScale * needPressure * (0.78 + random() * 0.44),
        );
        const capped = Math.min(legalMax, Math.max(minPrice, estimate));
        return {
          owner,
          maximum: minPrice + Math.floor((capped - minPrice) / increment) * increment,
          tieBreaker: random(),
        };
      })
      .filter(Boolean)
      .sort(
        (left, right) =>
          right.maximum - left.maximum || right.tieBreaker - left.tieBreaker,
      );

    const winner = bids[0];
    const runnerUp = bids[1]?.maximum ?? 0;
    const nextBid = Math.max(minPrice, runnerUp + increment);
    const price = Math.min(winner.maximum, nextBid);
    credits[winner.owner] -= price;
    needs[winner.owner][role]--;
    events.push({
      playerId: player.id,
      owner: winner.owner,
      price,
      nominator,
      callNumber: call,
    });
  }

  return events;
};

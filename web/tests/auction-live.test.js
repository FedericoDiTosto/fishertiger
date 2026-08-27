import test from "node:test";
import assert from "node:assert/strict";
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const {
  assignPlayerInAuction,
  defaultUserTeamIndex,
  notifyAuctionChanged,
  playerAuctionStatus,
  readAuctionBoard,
  releasePlayerInAuction,
  subscribeAuctionChanges,
  userTeamStorageKey,
} = await import("../src/auction-live.js");
const { auctionStorageKey } = await import("../src/auction-state.js");

const rules = { participants: 3, teamNames: ["Mia", "Altra", "Terza"] };

test("the user team is read from an index or a team name", () => {
  assert.equal(defaultUserTeamIndex({ ...rules, userTeam: 2 }), 2);
  assert.equal(defaultUserTeamIndex({ ...rules, userTeam: "Altra" }), 1);
});

test("an out-of-range or missing user team falls back to the first squad", () => {
  assert.equal(defaultUserTeamIndex({ ...rules, userTeam: 9 }), 0);
  assert.equal(defaultUserTeamIndex({ ...rules, userTeam: "Assente" }), 0);
  assert.equal(defaultUserTeamIndex(rules), 0);
  assert.equal(defaultUserTeamIndex(undefined), 0);
});

test("the chosen team is stored per profile", () => {
  assert.equal(userTeamStorageKey("Fantabosco"), "fanta-auction-user-team:Fantabosco");
  assert.equal(userTeamStorageKey(null), "fanta-auction-user-team:default");
});

const board = {
  teamNames: ["Mia", "Altra", "Terza"],
  assigned: { 7: { owner: 1, price: 24 }, 9: { owner: 0, price: 5 } },
  userTeamIndex: 0,
};

test("an assigned player reports its buyer and price", () => {
  assert.deepEqual(playerAuctionStatus(board, { id: 7 }), {
    owner: 1,
    price: 24,
    ownerName: "Altra",
    mine: false,
  });
  assert.equal(playerAuctionStatus(board, { id: 9 }).mine, true);
});

test("a free player, an unknown board and a missing player report nothing", () => {
  assert.equal(playerAuctionStatus(board, { id: 1 }), null);
  assert.equal(playerAuctionStatus(null, { id: 7 }), null);
  assert.equal(playerAuctionStatus(board, null), null);
});

test("a buyer without a stored name still gets a label", () => {
  const partial = { ...board, teamNames: [] };
  assert.equal(playerAuctionStatus(partial, { id: 7 }).ownerName, "Squadra 2");
});

test("subscribers are notified on same-tab writes and released on unsubscribe", () => {
  let calls = 0;
  const unsubscribe = subscribeAuctionChanges(() => (calls += 1));
  notifyAuctionChanged();
  assert.equal(calls, 1);
  unsubscribe();
  notifyAuctionChanged();
  assert.equal(calls, 1);
});

const liveRules = {
  participants: 2,
  teamNames: ["Mia", "Rivale"],
  userTeam: 0,
  startingCredits: 30,
  rosterSlots: { P: 1, A: 1 },
  auction: { minPrice: 2, increment: 2, reserve: 2, nomination: "call" },
};
const livePlayers = [
  { id: 1, nome: "Portiere", ruolo: "P" },
  { id: 2, nome: "Bomber", ruolo: "A" },
];
const PROFILE = "test-live";
const resetAuction = () => {
  store.clear();
  store.set(auctionStorageKey(PROFILE), JSON.stringify({
    version: 2,
    teams: [{ name: "Mia", startingCredits: 30 }, { name: "Rivale", startingCredits: 30 }],
    history: [],
    undone: [],
  }));
};

test("a profile with no saved auction still gets an empty, usable board", () => {
  store.clear();
  const board = readAuctionBoard(PROFILE, livePlayers, liveRules);
  assert.equal(board.taken, 0);
  assert.deepEqual(board.teamNames, ["Mia", "Rivale"]);
  assert.equal(board.teams[0].maxBid, 28);
});

test("assigning from the players page lands in the auction the other view reads", () => {
  resetAuction();
  const result = assignPlayerInAuction(PROFILE, livePlayers, liveRules, { playerId: 2, owner: 1, price: 12 });
  assert.equal(result.ok, true);
  const board = readAuctionBoard(PROFILE, livePlayers, liveRules);
  assert.deepEqual(playerAuctionStatus(board, { id: 2 }), {
    owner: 1, price: 12, ownerName: "Rivale", mine: false,
  });
  assert.equal(board.teams[1].credits, 18);
});

test("an assignment the auction view would reject is refused and changes nothing", () => {
  resetAuction();
  assignPlayerInAuction(PROFILE, livePlayers, liveRules, { playerId: 2, owner: 1, price: 12 });
  const before = store.get(auctionStorageKey(PROFILE));
  for (const [request, reason] of [
    [{ playerId: 2, owner: 0, price: 4 }, "already assigned"],
    [{ playerId: 1, owner: 0, price: 3 }, "off the bid increment"],
    [{ playerId: 1, owner: 0, price: 1 }, "below the minimum"],
    [{ playerId: 1, owner: 0, price: 40 }, "over the legal maximum"],
    [{ playerId: 1, owner: 9, price: 4 }, "unknown buyer"],
    [{ playerId: 99, owner: 0, price: 4 }, "unknown player"],
  ]) {
    const rejected = assignPlayerInAuction(PROFILE, livePlayers, liveRules, request);
    assert.equal(rejected.ok, false, reason);
    assert.match(rejected.message, /\S/);
  }
  assert.equal(store.get(auctionStorageKey(PROFILE)), before);
});

test("a by-role nomination phase blocks the roles that are not in auction yet", () => {
  resetAuction();
  const byRole = { ...liveRules, auction: { ...liveRules.auction, nomination: "call_by_role" } };
  const early = assignPlayerInAuction(PROFILE, livePlayers, byRole, { playerId: 2, owner: 0, price: 4 });
  assert.equal(early.ok, false);
  assert.equal(assignPlayerInAuction(PROFILE, livePlayers, byRole, { playerId: 1, owner: 0, price: 4 }).ok, true);
});

test("releasing a player gives the credits and the slot back", () => {
  resetAuction();
  assignPlayerInAuction(PROFILE, livePlayers, liveRules, { playerId: 2, owner: 0, price: 12 });
  assert.equal(releasePlayerInAuction(PROFILE, livePlayers, liveRules, 2).ok, true);
  const board = readAuctionBoard(PROFILE, livePlayers, liveRules);
  assert.equal(board.taken, 0);
  assert.equal(board.teams[0].credits, 30);
  assert.equal(releasePlayerInAuction(PROFILE, livePlayers, liveRules, 2).ok, false);
});

test("a write from this page notifies the mirrors", () => {
  resetAuction();
  let calls = 0;
  const unsubscribe = subscribeAuctionChanges(() => (calls += 1));
  assignPlayerInAuction(PROFILE, livePlayers, liveRules, { playerId: 1, owner: 0, price: 4 });
  assert.equal(calls, 1);
  unsubscribe();
});

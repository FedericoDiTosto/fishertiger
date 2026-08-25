import test from "node:test";
import assert from "node:assert/strict";
import { generateRandomAuction } from "../src/random-auction-engine.js";

const SLOTS = { P: 3, D: 8, C: 8, A: 6 };
const TEAM_COUNT = 8;

const makePlayers = () => {
  let id = 1;
  return Object.entries(SLOTS).flatMap(([ruolo, slots]) =>
    Array.from({ length: slots * TEAM_COUNT + 12 }, (_, rank) => ({
      id: id++,
      ruolo,
      nome: `${ruolo}-${rank + 1}`,
      fvm_scaled: Math.max(1, (slots * TEAM_COUNT + 12 - rank) * 2.25),
    })),
  );
};

const roleById = (players) =>
  new Map(players.map((player) => [player.id, player.ruolo]));

const eventsFor = (policy, seed = "modes") =>
  generateRandomAuction(makePlayers(), {
    seed,
    rules: { auction: { nomination: policy } },
  });

test("the same seed produces the same auction", () => {
  const players = makePlayers();
  assert.deepEqual(
    generateRandomAuction(players, { seed: "repeatable" }),
    generateRandomAuction(players, { seed: "repeatable" }),
  );
});

test("different seeds vary the auction", () => {
  const players = makePlayers();
  assert.notDeepEqual(
    generateRandomAuction(players, { seed: "first" }),
    generateRandomAuction(players, { seed: "second" }),
  );
});

test("every sold player is unique", () => {
  const events = generateRandomAuction(makePlayers(), { seed: 12 });
  assert.equal(
    new Set(events.map((event) => event.playerId)).size,
    events.length,
  );
});

test("every team receives exactly P3 D8 C8 A6", () => {
  const players = makePlayers();
  const roles = roleById(players);
  const events = generateRandomAuction(players, { seed: 33 });

  for (let owner = 0; owner < TEAM_COUNT; owner++) {
    const counts = { P: 0, D: 0, C: 0, A: 0 };
    events
      .filter((event) => event.owner === owner)
      .forEach((event) => counts[roles.get(event.playerId)]++);
    assert.deepEqual(counts, SLOTS);
  }
});

test("each sale respects per-team budgets and reserves one credit per open slot", () => {
  const players = makePlayers();
  const roles = roleById(players);
  const starts = [260, 300, 340, 380, 420, 460, 500, 540];
  const credits = starts.slice();
  const openSlots = Array(TEAM_COUNT).fill(25);
  const events = generateRandomAuction(players, {
    seed: "legal",
    startingCredits: starts,
  });

  for (const event of events) {
    assert.ok(event.price >= 1);
    assert.ok(
      event.price <= credits[event.owner] - (openSlots[event.owner] - 1),
    );
    assert.ok(roles.has(event.playerId));
    credits[event.owner] -= event.price;
    openSlots[event.owner]--;
  }
  assert.ok(credits.every((credit) => credit >= 0));
  assert.ok(openSlots.every((slots) => slots === 0));
});

test("a complete auction has exactly 200 numbered final-sale events", () => {
  const events = generateRandomAuction(makePlayers(), {
    seed: 99,
    startingCredits: 300,
  });
  assert.equal(events.length, 200);
  assert.deepEqual(
    events.map((event) => event.callNumber),
    Array.from({ length: 200 }, (_, index) => index + 1),
  );
  for (const event of events) {
    assert.deepEqual(Object.keys(event).sort(), [
      "callNumber",
      "nominator",
      "owner",
      "playerId",
      "price",
    ]);
    assert.ok(event.owner >= 0 && event.owner < TEAM_COUNT);
    assert.ok(event.nominator >= 0 && event.nominator < TEAM_COUNT);
  }
});

for (const policy of ["call_by_role", "random_by_role", "alphabetical_by_role"]) {
  test(`${policy} completes each role phase before beginning the next`, () => {
    const players = makePlayers();
    const roles = roleById(players);
    const sequence = eventsFor(policy).map((event) => roles.get(event.playerId));
    assert.deepEqual(sequence, [
      ...Array(TEAM_COUNT * SLOTS.P).fill("P"),
      ...Array(TEAM_COUNT * SLOTS.D).fill("D"),
      ...Array(TEAM_COUNT * SLOTS.C).fill("C"),
      ...Array(TEAM_COUNT * SLOTS.A).fill("A"),
    ]);
  });
}

test("random nomination selects from the global eligible pool reproducibly", () => {
  const players = makePlayers();
  const roles = roleById(players);
  const first = eventsFor("random", "global-random")[0];
  assert.deepEqual(eventsFor("random", "global-random"), eventsFor("random", "global-random"));
  assert.equal(roles.get(first.playerId), "D");
});

for (const policy of ["alphabetical", "alphabetical_by_role"]) {
  test(`${policy} selects alphabetically`, () => {
    const players = makePlayers();
    const names = new Map(players.map((player) => [player.id, player.nome]));
    const events = eventsFor(policy);
    if (policy === "alphabetical") {
      const selected = events.map((event) => names.get(event.playerId));
      assert.deepEqual(selected, selected.slice().sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" })));
    } else {
      const roles = roleById(players);
      for (const role of Object.keys(SLOTS)) {
        const selected = events.filter((event) => roles.get(event.playerId) === role).map((event) => names.get(event.playerId));
        assert.deepEqual(selected, selected.slice().sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" })));
      }
    }
  });
}

for (const policy of ["call", "call_by_role"]) {
  test(`${policy} uses seeded random player calls while preserving its caller policy`, () => {
    const first = eventsFor(policy, "one");
    const second = eventsFor(policy, "two");

    assert.notDeepEqual(first.map((event) => event.playerId), second.map((event) => event.playerId));
    assert.deepEqual(
      first.slice(0, TEAM_COUNT).map((event) => event.nominator),
      Array.from({ length: TEAM_COUNT }, (_, index) => index),
    );
  });
}

for (const policy of ["random", "random_by_role"]) {
  test(`${policy} randomizes the caller`, () => {
    const nominators = eventsFor(policy).map((event) => event.nominator);
    assert.ok(new Set(nominators).size > 1);
  });
}

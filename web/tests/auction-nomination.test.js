import test from "node:test";
import assert from "node:assert/strict";
import { activeNominationRole } from "../src/auction-nomination.js";

const rules = { auction: { nomination: "call_by_role" }, rosterSlots: { P: 1, D: 1, C: 1, A: 1 } };
const teams = (rosters) => rosters.map((roster) => ({ roster }));

test("role nomination advances only after every team fills the active role", () => {
  assert.equal(activeNominationRole(teams([[], []]), rules), "P");
  assert.equal(activeNominationRole(teams([[{ ruolo: "P" }], []]), rules), "P");
  assert.equal(activeNominationRole(teams([[{ ruolo: "P" }], [{ ruolo: "P" }]]), rules), "D");
});

test("general nominations do not restrict the active role", () => {
  assert.equal(activeNominationRole(teams([[], []]), { ...rules, auction: { nomination: "call" } }), null);
});

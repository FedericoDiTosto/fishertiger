import test from "node:test";
import assert from "node:assert/strict";
import { exactTiePolicies, nominationPolicies, sourceFormats, supportedValues, tieBreakers } from "../src/league-settings-policies.js";

test("the settings policy catalog only exposes supported persisted values", () => {
  assert.deepEqual(sourceFormats.map(({ value }) => value), ["csv", "xlsx", "json"]);
  assert(supportedValues(exactTiePolicies).has("shared_rank"));
  assert.deepEqual(nominationPolicies.map(({ value }) => value), ["call", "call_by_role", "random", "random_by_role", "alphabetical", "alphabetical_by_role"]);
  assert.deepEqual(tieBreakers.map(({ value }) => value), ["goal_difference", "head_to_head", "season_fantasy_score"]);
  assert(!tieBreakers.some(({ label }) => label === "Punti in classifica"));
});

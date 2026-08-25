import test from "node:test";
import assert from "node:assert/strict";
import { synchronizeFantasyRange } from "../src/league-settings-range.js";

test("derives fantasy matchdays and constrains the selected interval", () => {
  const season = synchronizeFantasyRange({
    serie_a_matchdays: 38,
    fantasy_matchdays: 36,
    fantasy_start_matchday: 3,
    fantasy_end_matchday: 38,
  });

  assert.equal(season.fantasy_matchdays, 36);
  assert.deepEqual(
    synchronizeFantasyRange(season, "fantasy_start_matchday", 40),
    { ...season, fantasy_start_matchday: 38, fantasy_end_matchday: 38, fantasy_matchdays: 1 },
  );
});

test("uses the shipped count as the end of a legacy profile range", () => {
  const season = synchronizeFantasyRange({ serie_a_matchdays: 38, fantasy_matchdays: 36 });

  assert.equal(season.fantasy_start_matchday, 1);
  assert.equal(season.fantasy_end_matchday, 36);
});

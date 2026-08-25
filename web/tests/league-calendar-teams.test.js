import test from "node:test";
import assert from "node:assert/strict";
import {
  participantsFromCalendar,
  teamsFromLeagueCalendar,
} from "../src/league-calendar-teams.js";

test("reads participants from a canonical league calendar", () => {
  const calendar = { teams: ["Alpha", "Beta", "Alpha"] };

  assert.deepEqual(teamsFromLeagueCalendar(calendar), ["Alpha", "Beta"]);
  assert.deepEqual(
    participantsFromCalendar(
      { team_names: ["Old 1", "Old 2"], user_team: "Old 1" },
      calendar,
    ),
    { team_names: ["Alpha", "Beta"], user_team: "Alpha" },
  );
});

test("reads participants from the generated flat fixture calendar", () => {
  const calendar = [
    { home_team: "Team B", away_team: "Team A" },
    { home_team: "Team C", away_team: "Team B" },
  ];

  assert.deepEqual(teamsFromLeagueCalendar(calendar), [
    "Team B",
    "Team A",
    "Team C",
  ]);
});

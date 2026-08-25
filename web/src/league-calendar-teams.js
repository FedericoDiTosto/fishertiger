const cleanNames = (values) => [
  ...new Set(
    values
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean),
  ),
];

export function teamsFromLeagueCalendar(calendar) {
  if (Array.isArray(calendar?.teams)) return cleanNames(calendar.teams);

  const matchdays = Array.isArray(calendar?.matchdays)
    ? calendar.matchdays
    : Array.isArray(calendar)
      ? calendar
      : [];
  const fixtures = matchdays.flatMap((matchday) =>
    Array.isArray(matchday?.fixtures) ? matchday.fixtures : [matchday],
  );

  return cleanNames(
    fixtures.flatMap((fixture) => [
      fixture?.home ?? fixture?.home_team ?? fixture?.casa,
      fixture?.away ?? fixture?.away_team ?? fixture?.trasferta,
    ]),
  );
}

export function participantsFromCalendar(participants, calendar) {
  const teamNames = teamsFromLeagueCalendar(calendar);
  if (teamNames.length < 2) return participants;
  return {
    team_names: teamNames,
    user_team: teamNames.includes(participants?.user_team)
      ? participants.user_team
      : teamNames[0],
  };
}

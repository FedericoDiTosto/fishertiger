export function synchronizeFantasyRange(season, changedField, changedValue) {
  const serieA = Math.max(
    1,
    Number(changedField === "serie_a_matchdays" ? changedValue : season.serie_a_matchdays),
  );
  let start = Number(
    changedField === "fantasy_start_matchday"
      ? changedValue
      : season.fantasy_start_matchday ?? 1,
  );
  let end = Number(
    changedField === "fantasy_end_matchday"
      ? changedValue
      : season.fantasy_end_matchday ?? start + Number(season.fantasy_matchdays) - 1,
  );
  start = Math.min(Math.max(1, start), serieA);
  end = Math.min(Math.max(start, end), serieA);
  return {
    ...season,
    serie_a_matchdays: serieA,
    fantasy_start_matchday: start,
    fantasy_end_matchday: end,
    fantasy_matchdays: end - start + 1,
  };
}

from advisor.config import LeagueConfig
from advisor import simulation


def _players():
    roles = {1: "P", 2: "D", 3: "D", 4: "D", 5: "D", 6: "C", 7: "C", 8: "C", 9: "C", 10: "A", 11: "A", 12: "A", 13: "A"}
    return {
        player_id: {
            "id": player_id,
            "ruolo": role,
            "squadra": "Club",
            "p_gioca_per_giornata": [1.0],
            "voto_puro_mean_per_giornata": [9.0 if player_id in {5, 13} else 10.0],
            "voto_puro_std_per_giornata": [0.0],
            "bonus_atteso_per_giornata": [0.0],
        }
        for player_id, role in roles.items()
    }


def _set_outcomes(monkeypatch, absent=()):
    def draw(player, day_index, rng, team_factor):
        if player["id"] in absent:
            return {"id": player["id"], "ruolo": player["ruolo"], "selection_value": 0.0, "plays": False}
        vote = 20.0 if player["id"] == 5 else (1.0 if player["id"] == 12 else 10.0)
        return {"id": player["id"], "ruolo": player["ruolo"], "selection_value": vote, "plays": True, "pure": vote, "fantavote": vote}

    monkeypatch.setattr(simulation, "_draw_outcome", draw)


def test_playing_starter_is_not_replaced_by_higher_scoring_bench_player(monkeypatch):
    _set_outcomes(monkeypatch)

    _, lineup = simulation._team_score(list(range(1, 14)), _players(), 0, {}, None, LeagueConfig(defense_modifier_enabled=False))

    assert {player["id"] for player in lineup} == {1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12}


def test_absent_starter_is_replaced_only_by_the_same_role(monkeypatch):
    _set_outcomes(monkeypatch, absent={12})

    _, lineup = simulation._team_score(list(range(1, 14)), _players(), 0, {}, None, LeagueConfig(defense_modifier_enabled=False))

    assert {player["id"] for player in lineup} == {1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 13}

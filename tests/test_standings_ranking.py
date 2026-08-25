from advisor.simulation import _standing_keys


def test_points_always_precede_configured_tie_breakers():
    keys = _standing_keys(
        ["Higher", "Lower"],
        {"Higher": 10, "Lower": 9},
        {"Higher": 0, "Lower": 99},
        {"Higher": 0, "Lower": 0},
        {"Higher": 0, "Lower": 99},
        {"Higher": {"Lower": 0}, "Lower": {"Higher": 3}},
        ("goal_difference", "head_to_head", "season_fantasy_score"),
    )

    assert sorted(keys, key=keys.__getitem__, reverse=True) == ["Higher", "Lower"]


def test_configured_priority_changes_a_points_tie_and_head_to_head_uses_only_tie_group():
    names = ["Alpha", "Beta", "Other"]
    common = dict(
        names=names,
        points={"Alpha": 10, "Beta": 10, "Other": 7},
        goals_for={"Alpha": 8, "Beta": 7, "Other": 20},
        goals_against={"Alpha": 7, "Beta": 7, "Other": 0},
        season_scores={"Alpha": 100.0, "Beta": 90.0, "Other": 0.0},
        direct_points={"Alpha": {"Beta": 0, "Other": 3}, "Beta": {"Alpha": 3, "Other": 0}, "Other": {"Alpha": 0, "Beta": 0}},
    )

    goal_first = _standing_keys(**common, tie_breakers=("goal_difference", "head_to_head"))
    head_to_head_first = _standing_keys(**common, tie_breakers=("head_to_head", "goal_difference"))

    assert sorted(goal_first, key=goal_first.__getitem__, reverse=True)[:2] == ["Alpha", "Beta"]
    assert sorted(head_to_head_first, key=head_to_head_first.__getitem__, reverse=True)[:2] == ["Beta", "Alpha"]

from advisor.defense import defense_modifier


def test_modifier_requires_four_defenders():
    assert defense_modifier(7, [7, 7, 7]) == 0


def test_modifier_uses_best_three_and_a_table_thresholds():
    assert defense_modifier(6.5, [6.0, 6.0, 6.5, 7.5], "A") == 3
    assert defense_modifier(6.49, [6.49, 6.49, 6.49, 6.49], "A") == 1


def test_league_modifier_table():
    assert defense_modifier(6.0, [6.0, 6.0, 6.0, 6.0], "LEAGUE") == 1
    assert defense_modifier(6.5, [6.5, 6.5, 6.5, 6.5], "LEAGUE") == 2
    assert defense_modifier(7.0, [7.0, 7.0, 7.0, 7.0], "LEAGUE") == 3

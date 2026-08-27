import json
from pathlib import Path

from advisor.freshness import (
    dataset_configuration_hash,
    dataset_input_hash,
    simulation_configuration_hash,
)
from advisor.league_profile import LeagueProfile


def profile():
    value = json.loads(
        (Path(__file__).parents[1] / "config/default_profile.json").read_text(
            encoding="utf-8"
        )
    )
    return LeagueProfile.from_dict(value)


def test_dataset_configuration_ignores_save_and_simulation_only_fields():
    original = profile()
    value = original.to_dict()
    value["name"] = "Another display name"
    value["defense_modifier"]["enabled"] = not value["defense_modifier"]["enabled"]

    assert dataset_configuration_hash(LeagueProfile.from_dict(value)) == dataset_configuration_hash(original)


def test_simulation_configuration_changes_with_simulation_rules():
    original = profile()
    value = original.to_dict()
    value["virtual_goals"]["threshold"] += 1

    assert simulation_configuration_hash(LeagueProfile.from_dict(value)) != simulation_configuration_hash(original)


def test_dataset_input_hash_ignores_mtime_when_content_is_identical():
    first = [{"name": "source", "exists": True, "size_bytes": 3, "sha256": "abc", "modified_at": "2026-01-01T00:00:00Z"}]
    second = [{**first[0], "modified_at": "2026-01-02T00:00:00Z"}]

    assert dataset_input_hash(profile(), first) == dataset_input_hash(profile(), second)

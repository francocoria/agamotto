def test_seed_teams_count():
    from agamotto.ingestion.seed.teams_2026 import TEAMS_2026
    assert len(TEAMS_2026) == 48
    confs = {t[3] for t in TEAMS_2026}
    assert {"CONMEBOL", "UEFA", "CAF", "AFC", "CONCACAF", "OFC"}.issubset(confs)


def test_seed_venues_count():
    from agamotto.ingestion.seed.venues_2026 import VENUES_2026
    assert len(VENUES_2026) == 16
    countries = {v["country"] for v in VENUES_2026}
    assert countries == {"USA", "Mexico", "Canada"}


def test_seed_groups_distribute():
    from agamotto.ingestion.seed.groups_2026 import GROUPS_2026
    assert len(GROUPS_2026) == 12
    teams = []
    for grp, members in GROUPS_2026.items():
        assert len(members) == 4, f"Group {grp} must have 4 teams"
        teams.extend(members)
    assert len(set(teams)) == 48


def test_fixtures_count():
    from agamotto.ingestion.seed.fixtures_2026 import all_fixtures
    fx = all_fixtures()
    assert len(fx) == 104, f"Mundial 2026 tiene 104 partidos, got {len(fx)}"
    group_count = sum(1 for f in fx if f["stage"] == "group")
    assert group_count == 72

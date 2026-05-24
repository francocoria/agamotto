from agamotto.core.ids import team_id, venue_id, player_id, match_id, referee_id

def test_team_id():
    assert team_id("Argentina") == "ARGENTINA"
    assert team_id("Côte d'Ivoire") == "COTE_D_IVOIRE"
    assert team_id("United States") == "UNITED_STATES"

def test_venue_id():
    assert venue_id("Estadio Azteca") == "ESTADIO_AZTECA"
    assert venue_id("Estadio Azteca", "Mexico City") == "ESTADIO_AZTECA__MEXICO_CITY"

def test_player_id():
    assert player_id("Lionel Messi") == "LIONEL_MESSI"
    assert player_id("Lionel Messi", "1987-06-24") == "LIONEL_MESSI__19870624"

def test_match_id():
    assert match_id("World Cup 2026", "group", "A1") == "WORLD_CUP_2026_GROUP_A1"

def test_referee_id():
    assert referee_id("Néstor Pitana") == "NESTOR_PITANA"
    assert referee_id("Néstor Pitana", "Argentina") == "NESTOR_PITANA__ARGENTINA"

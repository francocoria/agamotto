import numpy as np
import pytest
from agamotto.simulator.tournament import (
    _sample_scoreline,
    _sample_winner_knockout,
    _simulate_group,
    GroupResult,
)

def test_sample_scoreline():
    rng = np.random.default_rng(42)
    # A matrix where 1-1 is guaranteed (prob = 1.0)
    matrix = np.zeros((3, 3))
    matrix[1, 1] = 1.0
    
    hs, as_ = _sample_scoreline(rng, matrix)
    assert hs == 1
    assert as_ == 1

def test_sample_winner_knockout():
    rng = np.random.default_rng(42)
    # Home always wins
    matrix = np.zeros((3, 3))
    matrix[2, 0] = 1.0
    
    p_proba = {"home": 0.8, "draw": 0.1, "away": 0.1}
    winner, hs, as_ = _sample_winner_knockout(rng, matrix, p_proba, "ARG", "FRA")
    assert winner == "ARG"
    assert hs == 2
    assert as_ == 0

    # Draw scenario where home wins penals due to coin flip bias
    matrix_draw = np.zeros((3, 3))
    matrix_draw[1, 1] = 1.0
    # Make home_win penal prob extremely high
    p_proba_draw = {"home": 0.999, "draw": 0.0, "away": 0.001}
    
    winner_draw, hs_draw, as_draw = _sample_winner_knockout(rng, matrix_draw, p_proba_draw, "ARG", "FRA")
    assert winner_draw == "ARG"
    assert hs_draw == 1
    assert as_draw == 1

def test_group_result_sorting():
    gr1 = GroupResult("ARG", points=6, gf=5, ga=2, gd=3)
    gr2 = GroupResult("MEX", points=6, gf=4, ga=2, gd=2)
    gr3 = GroupResult("POL", points=4, gf=2, ga=2, gd=0)
    gr4 = GroupResult("KSA", points=1, gf=1, ga=6, gd=-5)
    
    # Sort teams by points, then gd, then gf
    teams_list = [gr4, gr2, gr1, gr3]
    teams_list.sort(key=lambda r: (-r.points, -r.gd, -r.gf))
    
    assert teams_list[0].team_id == "ARG"
    assert teams_list[1].team_id == "MEX"
    assert teams_list[2].team_id == "POL"
    assert teams_list[3].team_id == "KSA"

def test_simulate_group():
    rng = np.random.default_rng(42)
    teams = ["ARG", "MEX", "POL", "KSA"]
    
    # Create fixed matrices where ARG always wins, MEX beats others, etc.
    pred_win = {
        "scoreline_matrix": np.zeros((3, 3))
    }
    pred_win["scoreline_matrix"][2, 0] = 1.0 # 2-0 always
    
    pred_draw = {
        "scoreline_matrix": np.zeros((3, 3))
    }
    pred_draw["scoreline_matrix"][1, 1] = 1.0 # 1-1 always
    
    match_preds = {
        ("ARG", "MEX"): pred_win,
        ("ARG", "POL"): pred_win,
        ("ARG", "KSA"): pred_win,
        ("MEX", "POL"): pred_win,
        ("MEX", "KSA"): pred_win,
        ("POL", "KSA"): pred_win,
    }
    
    results = _simulate_group(rng, teams, match_preds)
    assert len(results) == 4
    # ARG won all 3 games -> 9 pts
    assert results[0].team_id == "ARG"
    assert results[0].points == 9
    # MEX won vs POL/KSA, lost to ARG -> 6 pts
    assert results[1].team_id == "MEX"
    assert results[1].points == 6

import numpy as np
import pytest
from types import SimpleNamespace
from agamotto.multiverse.engine import MultiverseEngine, Condition

def test_fix_result():
    # Mock prediction dictionary
    matrix = np.ones((9, 9)) / 81.0
    pred = {
        "scoreline_matrix": matrix,
        "p_home": 0.4,
        "p_draw": 0.2,
        "p_away": 0.4,
        "lambda_home": 1.2,
        "lambda_away": 1.2,
    }
    
    # Initialize engine with mocked simulator
    sim = SimpleNamespace(_match_preds={"match-1": pred}, _matches=[])
    engine = MultiverseEngine(sim=sim, conditions=[])
    
    # Apply fix_result condition
    engine._fix_result("match-1", 3, 1)
    
    # Assert prediction was modified correctly in place
    assert pred["p_home"] == 1.0
    assert pred["p_draw"] == 0.0
    assert pred["p_away"] == 0.0
    assert pred["lambda_home"] == 3.0
    assert pred["lambda_away"] == 1.0
    assert pred["scoreline_matrix"][3, 1] == 1.0
    assert pred["scoreline_matrix"].sum() == 1.0
    assert pred["scoreline_matrix"][0, 0] == 0.0

def test_fix_winner():
    matrix = np.ones((3, 3)) / 9.0
    pred = {
        "scoreline_matrix": matrix,
        "p_home": 0.33,
        "p_draw": 0.33,
        "p_away": 0.33,
    }
    
    # Home team wins
    matches = [{"match_id": "match-1", "home": "ARG", "away": "FRA"}]
    sim = SimpleNamespace(_match_preds={"match-1": pred}, _matches=matches)
    engine = MultiverseEngine(sim=sim, conditions=[])
    
    engine._fix_winner("match-1", "ARG")
    
    # The matrix must have tril (excluding diagonal) remaining, sum up to 1.0
    assert pred["p_home"] == 1.0
    assert pred["p_draw"] == 0.0
    assert pred["p_away"] == 0.0
    assert pytest.approx(pred["scoreline_matrix"].sum(), 1e-6) == 1.0
    # Under-diagonal indices in a 3x3 matrix are: (1,0), (2,0), (2,1)
    assert pred["scoreline_matrix"][0, 0] == 0.0
    assert pred["scoreline_matrix"][0, 1] == 0.0
    assert pred["scoreline_matrix"][0, 2] == 0.0
    assert pred["scoreline_matrix"][1, 1] == 0.0
    assert pred["scoreline_matrix"][1, 2] == 0.0
    assert pred["scoreline_matrix"][2, 2] == 0.0
    
    assert pred["scoreline_matrix"][1, 0] > 0.0
    assert pred["scoreline_matrix"][2, 0] > 0.0
    assert pred["scoreline_matrix"][2, 1] > 0.0

def test_override_weather():
    # Setup mock with dc rho and max_goals
    poisson_mock = SimpleNamespace(max_goals=8)
    poisson_mock.lambda_home_away = lambda h, a, neutral: (1.5, 1.2)
    dc_mock = SimpleNamespace(poisson=poisson_mock, rho=0.0)
    ens_mock = SimpleNamespace(dc=dc_mock)
    
    pred = {
        "scoreline_matrix": np.ones((9, 9)) / 81.0,
        "p_home": 0.4,
        "p_draw": 0.2,
        "p_away": 0.4,
        "lambda_home": 2.0,
        "lambda_away": 2.0,
    }
    
    sim = SimpleNamespace(_match_preds={"match-1": pred}, _matches=[], ens=ens_mock)
    engine = MultiverseEngine(sim=sim, conditions=[])
    
    # Under high heat (35 degrees), lambdas should decerease
    engine._override_weather("match-1", 35, 80)
    
    # 2.0 * 0.95 (temp > 30) * 0.97 (humidity > 70) = 1.843
    assert pytest.approx(pred["lambda_home"], 0.01) == 1.843
    assert pytest.approx(pred["lambda_away"], 0.01) == 1.843
    assert pytest.approx(pred["scoreline_matrix"].sum(), 1e-6) == 1.0

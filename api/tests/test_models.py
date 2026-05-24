import numpy as np
import pytest
from datetime import date
from agamotto.models.elo import EloModel
from agamotto.models.poisson import PoissonModel
from agamotto.models.dixon_coles import DixonColesModel
from agamotto.models.calibration import IsotonicCalibrator, brier_multiclass, log_loss_multiclass

def test_elo_prediction():
    ratings = {"ARG": 1800.0, "FRA": 1750.0}
    last_played = {"ARG": date(2026, 3, 1), "FRA": date(2026, 3, 1)}
    model = EloModel(ratings=ratings, last_played=last_played, home_adv=50.0)
    
    # Check simple expectations
    e_home = model.expected_score(1800.0, 1750.0, neutral=True)
    # expected = 1 / (1 + 10^((1750-1800)/400)) = 1 / (1 + 10^(-0.125)) = 0.571
    assert pytest.approx(e_home, 0.01) == 0.571

    # Check probabilities dict
    probs = model.predict_proba("ARG", "FRA", neutral=True)
    assert "home" in probs
    assert "draw" in probs
    assert "away" in probs
    assert pytest.approx(sum(probs.values()), 1e-6) == 1.0
    assert probs["home"] > probs["away"]

def test_poisson_model():
    attack = {"ARG": 0.5, "MEX": -0.2}
    defense = {"ARG": -0.3, "MEX": 0.1}
    intercept = 0.2
    home_adv = 0.3
    
    model = PoissonModel(attack=attack, defense=defense, intercept=intercept, home_adv=home_adv)
    
    # Predict lambda
    lam_h, lam_a = model.lambda_home_away("ARG", "MEX", neutral=False)
    # log lam_h = intercept + home_adv + attack_h + defense_a = 0.2 + 0.3 + 0.5 + 0.1 = 1.1
    # lam_h = exp(1.1) = 3.004
    # log lam_a = intercept + attack_a + defense_h = 0.2 - 0.2 - 0.3 = -0.3
    # lam_a = exp(-0.3) = 0.741
    assert pytest.approx(lam_h, 0.01) == 3.004
    assert pytest.approx(lam_a, 0.01) == 0.741

    probs = model.predict_proba("ARG", "MEX", neutral=False)
    assert probs["home"] > probs["away"]
    assert pytest.approx(sum(probs.values()), 1e-4) == 1.0

def test_dixon_coles():
    p_model = PoissonModel(attack={"ARG": 0.2, "FRA": 0.1}, defense={"ARG": -0.1, "FRA": -0.1}, intercept=0.1, home_adv=0.0)
    model = DixonColesModel(poisson=p_model, rho=0.05)
    
    matrix = model.scoreline_matrix("ARG", "FRA", neutral=True)
    assert matrix.shape == (11, 11)
    assert pytest.approx(matrix.sum(), 1e-5) == 1.0

    probs = model.predict_proba("ARG", "FRA", neutral=True)
    assert pytest.approx(sum(probs.values()), 1e-5) == 1.0

def test_isotonic_calibrator_and_loss():
    p_pred = np.array([
        [0.7, 0.2, 0.1],
        [0.1, 0.8, 0.1],
        [0.2, 0.2, 0.6],
        [0.8, 0.1, 0.1],
    ])
    outcomes = np.array([0, 1, 2, 0]) # 0=home, 1=draw, 2=away, 0=home
    
    brier = brier_multiclass(p_pred, outcomes)
    loss = log_loss_multiclass(p_pred, outcomes)
    
    assert brier > 0.0
    assert loss > 0.0

    calibrator = IsotonicCalibrator()
    calibrator.fit(p_pred, outcomes)
    assert calibrator.fitted

    p_test = {"home": 0.7, "draw": 0.2, "away": 0.1}
    transformed = calibrator.transform(p_test)
    assert pytest.approx(sum(transformed.values()), 1e-6) == 1.0

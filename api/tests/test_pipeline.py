import pytest
from typer.testing import CliRunner
from agamotto.cli.main import app

runner = CliRunner()

def test_cli_status():
    result = runner.invoke(app, ["status"])
    assert result.exit_code == 0
    assert "agamotto_status" in result.stdout

def test_cli_predict():
    # Test prediction between two seeded teams
    result = runner.invoke(app, ["predict", "Argentina", "France"])
    assert result.exit_code == 0
    assert "p_home" in result.stdout
    assert "p_draw" in result.stdout
    assert "p_away" in result.stdout

def test_cli_train_pipeline():
    # Test training Elo
    result = runner.invoke(app, ["train", "elo", "--min-date", "2024-01-01"])
    assert result.exit_code == 0
    assert "Elo:" in result.stdout

    # Test training Poisson
    result = runner.invoke(app, ["train", "poisson", "--min-date", "2024-01-01"])
    assert result.exit_code == 0
    assert "Poisson:" in result.stdout

    # Test training Dixon-Coles
    result = runner.invoke(app, ["train", "dixon-coles", "--min-date", "2024-01-01"])
    assert result.exit_code == 0
    assert "Dixon-Coles:" in result.stdout

    # Test training Player Impact
    result = runner.invoke(app, ["train", "player-impact"])
    assert result.exit_code == 0
    assert "Player Impact:" in result.stdout

    # Test training Ensemble
    result = runner.invoke(app, ["train", "ensemble"])
    assert result.exit_code == 0
    assert "Ensemble:" in result.stdout

def test_cli_counterfactual():
    import json
    conds = [{"type": "fix_winner", "match_id": "WC2026-G1-M01", "winner_team_id": "ARG"}]
    result = runner.invoke(app, ["counterfactual", json.dumps(conds), "--runs", "10"])
    assert result.exit_code == 0
    assert "top_champions" in result.stdout

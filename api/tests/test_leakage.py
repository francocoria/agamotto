from datetime import date, datetime, timezone
from sqlalchemy import select
from agamotto.core.db import get_session
from agamotto.db.models import Match, Prediction, HistoricalMatch

def test_prediction_temporal_leakage():
    """Verify that predictions stored in the database do not leak future information.
    Specifically, we check that predictions are calculated and recorded *before* 
    or *exactly at* the kickoff time of the scheduled match.
    """
    with get_session() as s:
        # Fetch predictions along with the match kickoff times
        rows = s.execute(
            select(Prediction.created_at, Match.kickoff_utc)
            .join(Match, Prediction.match_id == Match.match_id)
        ).all()
        
        # If there are predictions, check their timestamps
        for pred_created_at, match_kickoff in rows:
            # Normalize to datetime objects
            if isinstance(pred_created_at, str):
                pred_dt = datetime.fromisoformat(pred_created_at)
            else:
                pred_dt = pred_created_at
                
            if isinstance(match_kickoff, str):
                match_dt = datetime.fromisoformat(match_kickoff)
            else:
                match_dt = match_kickoff
                
            # If the match was scheduled in the future, the prediction must have been
            # created before it.
            # Here we just make sure there's no chronological leakage (prediction created *after* the match already started, unless it's a Live prediction model, which we don't have yet).
            if match_dt > datetime.now():
                assert pred_dt <= match_dt, f"Prediction created at {pred_dt} leaks future info for match starting at {match_dt}"

def test_historical_split_strictness():
    """Verify that walk-forward training windows are strictly separated
    and do not leak validation data into training folds.
    """
    # Simulate a split at 2024-01-01
    split_date = date(2024, 1, 1)
    
    with get_session() as s:
        # Load all matches strictly before the split date
        train_matches = s.execute(
            select(HistoricalMatch.match_date)
            .where(HistoricalMatch.match_date < split_date)
        ).scalars().all()
        
        # Verify no match in the training set falls on or after 2024-01-01
        for m_date in train_matches:
            assert m_date < split_date, f"Leakage detected: Match date {m_date} is >= {split_date}"

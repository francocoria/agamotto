"""MartJ42 international results adapter.

Source: https://github.com/martj42/international_results (CC0)
Downloads results.csv and loads into historical_matches.
"""

from __future__ import annotations

import csv
from datetime import date

import requests
from sqlalchemy import delete

from agamotto.core.config import settings
from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import HistoricalMatch
from agamotto.ingestion.base import Adapter

log = get_logger(__name__)

CSV_URL = "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"


class MartJ42Adapter(Adapter):
    name = "martj42"

    def execute(self) -> int:
        raw_path = settings.raw_dir / "martj42_results.csv"
        log.info("Downloading %s", CSV_URL)
        r = requests.get(CSV_URL, timeout=120)
        r.raise_for_status()
        raw_path.write_bytes(r.content)
        log.info("Saved to %s (%d bytes)", raw_path, len(r.content))

        rows = 0
        batch: list[HistoricalMatch] = []
        with open(raw_path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    m = HistoricalMatch(
                        match_date=date.fromisoformat(row["date"]),
                        home_team=row["home_team"].strip(),
                        away_team=row["away_team"].strip(),
                        home_score=int(row["home_score"]),
                        away_score=int(row["away_score"]),
                        tournament=row.get("tournament", "").strip() or None,
                        city=row.get("city", "").strip() or None,
                        country=row.get("country", "").strip() or None,
                        neutral=(row.get("neutral", "False").strip().lower() == "true"),
                    )
                    batch.append(m)
                    rows += 1
                except (ValueError, KeyError):
                    continue
                if len(batch) >= 2000:
                    self._flush(batch)
                    batch = []
        if batch:
            self._flush(batch)
        return rows

    def _flush(self, batch: list[HistoricalMatch]) -> None:
        with get_session() as s:
            s.add_all(batch)

    @staticmethod
    def truncate() -> None:
        with get_session() as s:
            s.execute(delete(HistoricalMatch))


def run() -> int:
    MartJ42Adapter.truncate()
    return MartJ42Adapter().run()

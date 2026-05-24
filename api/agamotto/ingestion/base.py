"""Base class for provider adapters."""

from abc import ABC, abstractmethod
from datetime import datetime

from agamotto.core.db import get_session
from agamotto.core.logging import get_logger
from agamotto.db.models import IngestionRun

log = get_logger(__name__)


class Adapter(ABC):
    name: str = "base"

    def run(self) -> int:
        """Run ingestion and persist an IngestionRun row. Returns rows processed."""
        log.info("Starting ingest: %s", self.name)
        with get_session() as s:
            run = IngestionRun(provider=self.name, started_at=datetime.utcnow())
            s.add(run)
            s.flush()
            run_id = run.id
        try:
            rows = self.execute()
            with get_session() as s:
                run = s.get(IngestionRun, run_id)
                run.finished_at = datetime.utcnow()
                run.rows_processed = rows
                run.status = "ok"
            log.info("Ingest %s done: %d rows", self.name, rows)
            return rows
        except Exception as e:
            with get_session() as s:
                run = s.get(IngestionRun, run_id)
                run.finished_at = datetime.utcnow()
                run.status = "error"
                run.error = str(e)
            log.exception("Ingest %s failed", self.name)
            raise

    @abstractmethod
    def execute(self) -> int:
        """Actual ingestion logic. Return rows processed."""
        ...

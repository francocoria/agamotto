from collections.abc import Generator

from sqlalchemy.orm import Session

from agamotto.core.db import get_session


def db() -> Generator[Session, None, None]:
    with get_session() as s:
        yield s

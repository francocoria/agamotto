import os
import pytest

# Force a separate test DB so tests never touch the dev SQLite.
@pytest.fixture(scope="session", autouse=True)
def _test_env(tmp_path_factory):
    test_db = tmp_path_factory.mktemp("agamotto_test") / "test.sqlite"
    os.environ["AGAMOTTO_DATABASE_URL"] = f"sqlite:///{test_db.as_posix()}"
    # Re-init engine with the new URL
    from agamotto.core.db import init_engine
    init_engine()
    # Apply migrations
    from alembic import command
    from alembic.config import Config
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    cfg = Config(os.path.join(repo_root, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(repo_root, "migrations"))
    command.upgrade(cfg, "head")
    yield

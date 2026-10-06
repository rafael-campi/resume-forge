import os

import psycopg
import pytest
from psycopg import sql

from bot.repository.db import migrate
from bot.repository.repository import Repository

ADMIN_URL = os.getenv(
    "TEST_ADMIN_DATABASE_URL",
    "postgresql://apply_jobs:apply_jobs@localhost:5433/apply_jobs",
)
TEST_DB = "apply_jobs_test"
TEST_URL = os.getenv(
    "TEST_DATABASE_URL",
    f"postgresql://apply_jobs:apply_jobs@localhost:5433/{TEST_DB}",
)


@pytest.fixture(scope="session")
def test_database():
    """Garante um banco de teste isolado com as migrações aplicadas."""
    try:
        admin = psycopg.connect(ADMIN_URL, autocommit=True)
    except psycopg.OperationalError as exc:
        pytest.skip(f"Postgres indisponível (docker compose up -d db): {exc}")
    with admin:
        exists = admin.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (TEST_DB,)
        ).fetchone()
        if not exists:
            admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(TEST_DB)))
    with psycopg.connect(TEST_URL) as conn:
        migrate(conn)
    return TEST_URL


@pytest.fixture
def conn(test_database):
    with psycopg.connect(test_database) as connection:
        connection.execute(
            "TRUNCATE candidatura_historico, candidaturas, vagas RESTART IDENTITY CASCADE"
        )
        connection.commit()
        yield connection


@pytest.fixture
def repo(conn):
    return Repository(conn)

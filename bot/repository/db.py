"""
bot/repository/db.py
Conexão com o Postgres e aplicação das migrações numeradas.
"""

import os
from pathlib import Path

import psycopg

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def connect(url=None):
    """Abre uma conexão usando DATABASE_URL (ou a URL informada)."""
    url = url or os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("DATABASE_URL não definida (veja .env.example)")
    return psycopg.connect(url)


def migrate(conn):
    """
    Aplica as migrações .sql ainda não aplicadas, em ordem numérica.

    Returns:
        list: versões aplicadas nesta chamada
    """
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations ("
        "version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
    conn.commit()
    done = {row[0] for row in conn.execute("SELECT version FROM schema_migrations")}

    applied = []
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        if path.stem in done:
            continue
        try:
            conn.execute(path.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (path.stem,))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        applied.append(path.stem)
    return applied

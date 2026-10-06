import psycopg

from bot.repository.db import migrate


def test_migrar_de_novo_e_seguro(test_database):
    with psycopg.connect(test_database) as conn:
        first = migrate(conn)
        second = migrate(conn)

        assert second == []
        versions = [r[0] for r in conn.execute("SELECT version FROM schema_migrations ORDER BY version")]
        assert versions == sorted(versions)
        assert len(versions) >= 1
        assert isinstance(first, list)

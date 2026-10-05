"""
bot/repository/repository.py
Leitura e escrita de Vagas e Candidaturas no Postgres.
"""

from bot.domain.status import InvalidTransition, Status, can_transition
from bot.domain.vaga import Vaga


class Repository:
    def __init__(self, conn):
        self.conn = conn

    def upsert_vaga(self, vaga):
        """Grava a Vaga; gravar o mesmo job id de novo atualiza os dados, sem duplicar."""
        self.conn.execute(
            "INSERT INTO vagas (job_id, title, company, location, description) "
            "VALUES (%s, %s, %s, %s, %s) "
            "ON CONFLICT (job_id) DO UPDATE SET title = EXCLUDED.title, "
            "company = EXCLUDED.company, location = EXCLUDED.location, "
            "description = EXCLUDED.description, updated_at = now()",
            (vaga.job_id, vaga.title, vaga.company, vaga.location, vaga.description),
        )
        self.conn.commit()

    def get_vaga(self, job_id):
        row = self.conn.execute(
            "SELECT job_id, title, company, location, description FROM vagas WHERE job_id = %s",
            (job_id,),
        ).fetchone()
        return Vaga(*row) if row else None

    def count_vagas(self):
        return self.conn.execute("SELECT count(*) FROM vagas").fetchone()[0]

    def current_status(self, job_id):
        row = self.conn.execute(
            "SELECT status FROM candidaturas WHERE job_id = %s", (job_id,)
        ).fetchone()
        return Status(row[0]) if row else None

    def record_status(self, job_id, new):
        """
        Registra o novo Status da Candidatura, validando a transição.

        Raises:
            InvalidTransition: se a transição não é permitida; nada é gravado
        """
        current = self.current_status(job_id)
        if not can_transition(current, new):
            raise InvalidTransition(f"{job_id}: {current} -> {new}")
        self.conn.execute(
            "INSERT INTO candidaturas (job_id, status) VALUES (%s, %s) "
            "ON CONFLICT (job_id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()",
            (job_id, new.value),
        )
        self.conn.execute(
            "INSERT INTO candidatura_historico (job_id, status) VALUES (%s, %s)",
            (job_id, new.value),
        )
        self.conn.commit()

    def status_history(self, job_id):
        rows = self.conn.execute(
            "SELECT status FROM candidatura_historico WHERE job_id = %s ORDER BY id",
            (job_id,),
        ).fetchall()
        return [Status(r[0]) for r in rows]

    def applied_job_ids(self):
        rows = self.conn.execute(
            "SELECT job_id FROM candidaturas WHERE status = %s", (Status.ENVIADA.value,)
        ).fetchall()
        return {r[0] for r in rows}

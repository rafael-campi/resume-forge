"""
bot/curriculos/forge.py
Adaptador da porta Curriculos que usa o PDF exportado pelo resume-forge para a Vaga.

O resume-forge e o bot dividem o mesmo Postgres. O PDF mais recente de uma Vaga é achado pelo
job id (forge_vagas.job_id) na tabela forge_exportacoes, que é do resume-forge: aqui só se lê.
Sem PDF exportado, a Candidatura espera a Revisão do dono (Revisão manual).
"""

from pathlib import Path

import psycopg

from bot.domain.curriculo import CurriculoIndisponivel, MotivoIndisponivel

CONSULTA = (
    "SELECT e.id, e.pdf FROM forge_exportacoes e JOIN forge_vagas v ON v.id = e.vaga_id "
    "WHERE v.job_id = %s ORDER BY e.id DESC LIMIT 1"
)


class CurriculosForge:
    def __init__(self, conn, pasta="storage/curriculos"):
        self.conn = conn
        self.pasta = Path(pasta)

    def para(self, vaga):
        try:
            linha = self.conn.execute(CONSULTA, (vaga.job_id,)).fetchone()
        except psycopg.errors.UndefinedTable as erro:
            self.conn.rollback()  # a transação abortada não pode contaminar o resto do bot
            raise CurriculoIndisponivel(
                MotivoIndisponivel.FORGE_INDISPONIVEL,
                "as tabelas do resume-forge não existem neste banco: abra o resume-forge uma vez (npm run dev) "
                "ou use apply.curriculo: fixo",
            ) from erro

        if linha is None:
            raise CurriculoIndisponivel(
                MotivoIndisponivel.REVISAO_PENDENTE,
                f"ainda não há PDF exportado no resume-forge para a Vaga {vaga.job_id}: "
                f"crie, revise e exporte em /vagas/nova?jobId={vaga.job_id}",
            )

        exportacao_id, pdf = linha
        # O id da exportação no nome: um PDF reexportado vira outro arquivo e o anterior não é sobrescrito.
        caminho = self.pasta / f"{vaga.job_id}-{exportacao_id}.pdf"
        if not caminho.exists():
            self.pasta.mkdir(parents=True, exist_ok=True)
            caminho.write_bytes(bytes(pdf))
        return caminho

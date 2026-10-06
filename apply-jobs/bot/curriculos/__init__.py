"""
bot/curriculos
Adaptadores da porta Curriculos (bot/domain/curriculo.py). `criar_curriculos` escolhe um pela
configuração: apply.curriculo = "fixo" (um PDF só, apply.resume_path) ou "forge" (o PDF que o
resume-forge exportou para a Vaga).
"""

from bot.curriculos.fixo import PdfFixoCurriculos
from bot.curriculos.forge import CurriculosForge


def criar_curriculos(config, conn):
    if config["apply"]["curriculo"] == "forge":
        return CurriculosForge(conn)
    return PdfFixoCurriculos(config["apply"]["resume_path"])

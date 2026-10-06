"""
bot/curriculos/fixo.py
Adaptador da porta Curriculos que usa sempre o mesmo PDF (apply.resume_path).
É o comportamento anterior à porta: ignora a Vaga e nunca falha.
"""

from pathlib import Path


class PdfFixoCurriculos:
    def __init__(self, resume_path):
        self.resume_path = resume_path

    def para(self, vaga):
        return Path(self.resume_path) if self.resume_path else None

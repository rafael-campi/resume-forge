"""
bot/domain/vaga.py
Uma Vaga é uma publicação de emprego no LinkedIn, identificada pelo job id.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Vaga:
    job_id: str
    title: str
    company: str
    location: str
    description: str = ""

    @property
    def searchable_text(self):
        """Título e descrição em minúsculas, para os filtros de palavras-chave."""
        return f"{self.title} {self.description}".lower()

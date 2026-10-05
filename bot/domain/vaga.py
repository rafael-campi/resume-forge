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

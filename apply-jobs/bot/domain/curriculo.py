"""
bot/domain/curriculo.py
Porta Curriculos: de onde vem o currículo anexado a uma Candidatura. O domínio só
conhece esta interface; quem gera o currículo (um PDF fixo, ou um currículo
adaptado à Vaga) fica atrás dela.

    para(vaga) -> Path | None

- Devolve o caminho do PDF a anexar, ou None se não há currículo próprio (o
  formulário só falha se o LinkedIn pedir um currículo que não existe).
- Chamada antes de abrir o formulário, porque pode demorar.
- Falha esperada vira CurriculoIndisponivel; o `motivo` decide o Status.
"""

from enum import Enum


class MotivoIndisponivel(str, Enum):
    REVISAO_PENDENTE = "revisao_pendente"  # o dono ainda precisa revisar: Revisão manual
    IA_INDISPONIVEL = "ia_indisponivel"    # falha do serviço de IA: Falhou
    SAIDA_INVALIDA = "saida_invalida"      # a IA respondeu algo inutilizável: Falhou
    FORGE_INDISPONIVEL = "forge_indisponivel"  # o resume-forge não está acessível neste banco: Falhou


class CurriculoIndisponivel(Exception):
    """Não há currículo pronto para esta Vaga agora."""

    def __init__(self, motivo, mensagem=""):
        super().__init__(mensagem or motivo.value)
        self.motivo = motivo

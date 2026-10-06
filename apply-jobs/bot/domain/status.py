"""
bot/domain/status.py
Status de uma Candidatura e as transições permitidas entre eles.
Uma Candidatura só chega a ENVIADA depois de FORMULARIO_ABERTO: clicar em
Easy Apply não basta, o envio precisa ser confirmado pelo LinkedIn.
"""

from enum import Enum


class Status(str, Enum):
    VISTA = "vista"
    FILTRADA = "filtrada"
    FORMULARIO_ABERTO = "formulario_aberto"
    ENVIADA = "enviada"
    FALHOU = "falhou"
    REVISAO_MANUAL = "revisao_manual"


class InvalidTransition(Exception):
    """Transição de Status não permitida."""


_TRANSITIONS = {
    None: {Status.VISTA},
    Status.VISTA: {Status.FILTRADA, Status.FORMULARIO_ABERTO, Status.FALHOU},
    Status.FORMULARIO_ABERTO: {Status.ENVIADA, Status.FALHOU, Status.REVISAO_MANUAL},
    Status.REVISAO_MANUAL: {Status.FORMULARIO_ABERTO, Status.FALHOU},
    Status.FALHOU: {Status.FORMULARIO_ABERTO},
    Status.FILTRADA: {Status.VISTA},
    Status.ENVIADA: set(),
}


def can_transition(current, target):
    """Diz se a Candidatura pode ir de `current` (None se ainda não tem Status) para `target`."""
    return target in _TRANSITIONS[current]

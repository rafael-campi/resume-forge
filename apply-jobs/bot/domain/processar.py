"""
bot/domain/processar.py
Caso de uso "processar uma Vaga": obtém o currículo, abre o formulário, preenche,
envia (conforme o Modo de envio) e grava cada Status. Não conhece Selenium nem SQL:
depende de três portas injetadas, o repositório, os currículos (bot/domain/curriculo.py)
e o adaptador LinkedIn.

Porta do adaptador LinkedIn:
    abrir_formulario(vaga), preencher_formulario(curriculo), enviar(),
    envio_confirmado() -> bool, descartar_formulario()
"""

from bot.domain.curriculo import CurriculoIndisponivel, MotivoIndisponivel
from bot.domain.status import Status, can_transition

MODOS_DE_ENVIO = ("confirmar", "auto")


def processar_vaga(vaga, repo, linkedin, curriculos, modo, aprovar):
    """
    Processa uma Vaga já lida e devolve o Status resultante.

    Uma Vaga já Enviada é ignorada. O currículo é pedido antes de abrir o formulário:
    se não há currículo pronto, a Vaga vira Revisão manual (a revisão do dono está
    pendente) ou Falhou, e o formulário nem é aberto. Uma Candidatura só vira Enviada
    quando o LinkedIn confirma o envio; erros do adaptador viram Falhou e não propagam.

    Args:
        vaga: Vaga a processar
        repo: repositório (current_status, record_status)
        linkedin: adaptador LinkedIn
        curriculos: porta Curriculos, para(vaga) -> Path | None
        modo: Modo de envio, "confirmar" ou "auto"
        aprovar: callable(vaga) -> bool, consultado no modo "confirmar" com o
            formulário já preenchido
    """
    if modo not in MODOS_DE_ENVIO:
        raise ValueError(f"Modo de envio inválido: {modo!r} (use {' ou '.join(MODOS_DE_ENVIO)})")

    atual = repo.current_status(vaga.job_id)
    if atual == Status.ENVIADA:
        return Status.ENVIADA

    try:
        curriculo = curriculos.para(vaga)
    except CurriculoIndisponivel as erro:
        print(f"⚠️  Sem currículo para [{vaga.job_id}] {vaga.title}: {erro}")
        status = (
            Status.REVISAO_MANUAL
            if erro.motivo == MotivoIndisponivel.REVISAO_PENDENTE
            else Status.FALHOU
        )
        if atual != status:  # reexecutar não repete o mesmo Status no histórico
            repo.record_status(vaga.job_id, status)
        return status

    try:
        linkedin.abrir_formulario(vaga)
        if atual != Status.FORMULARIO_ABERTO:
            repo.record_status(vaga.job_id, Status.FORMULARIO_ABERTO)
        linkedin.preencher_formulario(curriculo)

        if modo == "confirmar" and not aprovar(vaga):
            linkedin.descartar_formulario()
            return Status.FORMULARIO_ABERTO

        linkedin.enviar()
        if linkedin.envio_confirmado():
            repo.record_status(vaga.job_id, Status.ENVIADA)
            return Status.ENVIADA
        repo.record_status(vaga.job_id, Status.FALHOU)
        return Status.FALHOU
    except Exception as erro:
        print(f"❌ Erro ao processar [{vaga.job_id}] {vaga.title}: {erro}")
        if not can_transition(repo.current_status(vaga.job_id), Status.FALHOU):
            raise  # não esconde o erro atrás de um Status que não aconteceu
        repo.record_status(vaga.job_id, Status.FALHOU)
        return Status.FALHOU

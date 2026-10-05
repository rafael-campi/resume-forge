"""
bot/domain/processar.py
Caso de uso "processar uma Vaga": abre o formulário, preenche, envia (conforme o
Modo de envio) e grava cada Status. Não conhece Selenium nem SQL: depende de duas
portas injetadas, o repositório e o adaptador LinkedIn.

Porta do adaptador LinkedIn:
    abrir_formulario(vaga), preencher_formulario(), enviar(),
    envio_confirmado() -> bool, descartar_formulario()
"""

from bot.domain.status import Status, can_transition

MODOS_DE_ENVIO = ("confirmar", "auto")


def processar_vaga(vaga, repo, linkedin, modo, aprovar):
    """
    Processa uma Vaga já lida e devolve o Status resultante.

    Uma Vaga já Enviada é ignorada. Uma Candidatura só vira Enviada quando o
    LinkedIn confirma o envio; erros do adaptador viram Falhou e não propagam.

    Args:
        vaga: Vaga a processar
        repo: repositório (current_status, record_status)
        linkedin: adaptador LinkedIn
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
        linkedin.abrir_formulario(vaga)
        if atual != Status.FORMULARIO_ABERTO:
            repo.record_status(vaga.job_id, Status.FORMULARIO_ABERTO)
        linkedin.preencher_formulario()

        if modo == "confirmar" and not aprovar(vaga):
            linkedin.descartar_formulario()
            return Status.FORMULARIO_ABERTO

        linkedin.enviar()
        if linkedin.envio_confirmado():
            return _registrar(repo, vaga, Status.ENVIADA)
        return _registrar(repo, vaga, Status.FALHOU)
    except Exception as erro:
        print(f"❌ Erro ao processar [{vaga.job_id}] {vaga.title}: {erro}")
        return _registrar(repo, vaga, Status.FALHOU)


def _registrar(repo, vaga, alvo):
    if can_transition(repo.current_status(vaga.job_id), alvo):
        repo.record_status(vaga.job_id, alvo)
    return repo.current_status(vaga.job_id)

import pytest

from bot.domain.status import InvalidTransition, Status
from bot.domain.vaga import Vaga


def vaga(job_id="111", title="Python Developer", company="Acme"):
    return Vaga(job_id=job_id, title=title, company=company, location="Remote")


def test_gravar_a_mesma_vaga_duas_vezes_nao_duplica(repo):
    repo.upsert_vaga(vaga())
    repo.upsert_vaga(vaga(title="Python Developer Sr"))

    assert repo.count_vagas() == 1
    assert repo.get_vaga("111").title == "Python Developer Sr"


def test_vagas_com_mesmo_titulo_e_empresa_mas_job_id_diferente_sao_distintas(repo):
    repo.upsert_vaga(vaga(job_id="111"))
    repo.upsert_vaga(vaga(job_id="222"))

    assert repo.count_vagas() == 2


def test_get_vaga_inexistente_devolve_none(repo):
    assert repo.get_vaga("999") is None


def test_status_inicial_e_ausente(repo):
    repo.upsert_vaga(vaga())

    assert repo.current_status("111") is None


def test_historico_registra_cada_transicao_em_ordem(repo):
    repo.upsert_vaga(vaga())
    repo.record_status("111", Status.VISTA)
    repo.record_status("111", Status.FORMULARIO_ABERTO)
    repo.record_status("111", Status.ENVIADA)

    assert repo.current_status("111") == Status.ENVIADA
    assert repo.status_history("111") == [
        Status.VISTA,
        Status.FORMULARIO_ABERTO,
        Status.ENVIADA,
    ]


def test_transicao_invalida_e_recusada_e_nada_e_gravado(repo):
    repo.upsert_vaga(vaga())
    repo.record_status("111", Status.VISTA)

    with pytest.raises(InvalidTransition):
        repo.record_status("111", Status.ENVIADA)

    assert repo.current_status("111") == Status.VISTA
    assert repo.status_history("111") == [Status.VISTA]


def test_enviada_ja_registrada_nao_aceita_nova_transicao(repo):
    repo.upsert_vaga(vaga())
    for status in (Status.VISTA, Status.FORMULARIO_ABERTO, Status.ENVIADA):
        repo.record_status("111", status)

    with pytest.raises(InvalidTransition):
        repo.record_status("111", Status.FORMULARIO_ABERTO)


def test_applied_job_ids_devolve_so_as_enviadas(repo):
    for job_id in ("1", "2", "3"):
        repo.upsert_vaga(vaga(job_id=job_id))
        repo.record_status(job_id, Status.VISTA)
    repo.record_status("1", Status.FORMULARIO_ABERTO)
    repo.record_status("1", Status.ENVIADA)
    repo.record_status("2", Status.FORMULARIO_ABERTO)

    assert repo.applied_job_ids() == {"1"}

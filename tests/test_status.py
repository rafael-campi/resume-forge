import pytest

from bot.domain.status import Status, can_transition


def test_primeiro_status_e_vista():
    assert can_transition(None, Status.VISTA)


@pytest.mark.parametrize("destino", [Status.ENVIADA, Status.FORMULARIO_ABERTO, Status.FALHOU])
def test_primeiro_status_nao_pode_pular_etapas(destino):
    assert not can_transition(None, destino)


def test_clicar_em_easy_apply_nao_basta_para_enviada():
    assert not can_transition(Status.VISTA, Status.ENVIADA)


def test_enviada_exige_formulario_aberto():
    assert can_transition(Status.FORMULARIO_ABERTO, Status.ENVIADA)


def test_enviada_e_final():
    for destino in Status:
        assert not can_transition(Status.ENVIADA, destino)


def test_vaga_filtrada_e_final():
    for destino in Status:
        assert not can_transition(Status.FILTRADA, destino)


def test_falha_pode_ser_tentada_de_novo():
    assert can_transition(Status.FALHOU, Status.FORMULARIO_ABERTO)


def test_revisao_manual_pode_voltar_ao_formulario():
    assert can_transition(Status.FORMULARIO_ABERTO, Status.REVISAO_MANUAL)
    assert can_transition(Status.REVISAO_MANUAL, Status.FORMULARIO_ABERTO)

from types import SimpleNamespace

from bot.domain.status import Status
from bot.domain.vaga import Vaga
from main import register_and_filter

CONFIG = {"filters": {"required_keywords": ["python"], "blocked_keywords": ["lead"]}}


def listed(job_id, title):
    vaga = Vaga(job_id=job_id, title=title, company="Acme", location="Remote")
    return SimpleNamespace(vaga=vaga, element=object())


def test_vaga_que_passa_nos_filtros_fica_como_vista(repo):
    kept = register_and_filter(repo, [listed("1", "Python Dev")], CONFIG)

    assert [k.vaga.job_id for k in kept] == ["1"]
    assert repo.current_status("1") == Status.VISTA


def test_vaga_barrada_pelos_filtros_vira_filtrada(repo):
    kept = register_and_filter(repo, [listed("1", "Python Tech Lead")], CONFIG)

    assert kept == []
    assert repo.current_status("1") == Status.FILTRADA


def test_vaga_ja_enviada_e_ignorada_e_continua_enviada(repo):
    repo.upsert_vaga(Vaga("1", "Python Dev", "Acme", "Remote"))
    for status in (Status.VISTA, Status.FORMULARIO_ABERTO, Status.ENVIADA):
        repo.record_status("1", status)

    kept = register_and_filter(repo, [listed("1", "Python Dev")], CONFIG)

    assert kept == []
    assert repo.current_status("1") == Status.ENVIADA


def test_rodar_duas_vezes_nao_quebra_nem_duplica(repo):
    register_and_filter(repo, [listed("1", "Python Dev")], CONFIG)
    register_and_filter(repo, [listed("1", "Python Dev")], CONFIG)

    assert repo.count_vagas() == 1
    assert repo.status_history("1") == [Status.VISTA]

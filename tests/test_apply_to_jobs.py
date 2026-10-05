import main
from bot.domain.status import Status
from bot.domain.vaga import Vaga
from tests.test_processar_vaga import FakeLinkedIn

CONFIG = {"apply": {"mode": "auto", "max_applications": 2, "delay_between_applications": 0}}


def preparar(repo, *job_ids):
    vagas = []
    for job_id in job_ids:
        vaga = Vaga(job_id, f"Vaga {job_id}", "Acme", "Remote")
        repo.upsert_vaga(vaga)
        repo.record_status(job_id, Status.VISTA)
        vagas.append(vaga)
    return vagas


def test_para_ao_atingir_o_limite_de_enviadas(repo):
    vagas = preparar(repo, "1", "2", "3")

    main.apply_to_jobs(vagas, repo, FakeLinkedIn(), CONFIG)

    assert [repo.current_status(v.job_id) for v in vagas] == [
        Status.ENVIADA, Status.ENVIADA, Status.VISTA,
    ]


def test_erro_em_uma_vaga_nao_interrompe_as_demais(repo):
    vagas = preparar(repo, "1", "2")

    class FalhaNaPrimeira(FakeLinkedIn):
        def abrir_formulario(self, vaga):
            if vaga.job_id == "1":
                raise RuntimeError("quebrou")
            super().abrir_formulario(vaga)

    main.apply_to_jobs(vagas, repo, FalhaNaPrimeira(), CONFIG)

    assert repo.current_status("1") == Status.FALHOU
    assert repo.current_status("2") == Status.ENVIADA

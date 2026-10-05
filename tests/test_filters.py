from bot.domain.filters import apply_filters
from bot.domain.vaga import Vaga


def vaga(job_id, title, description=""):
    return Vaga(job_id=job_id, title=title, company="Acme", location="Remote", description=description)


CONFIG = {"required_keywords": ["python", "backend"], "blocked_keywords": ["lead", "manager"]}


def test_ignora_vagas_ja_enviadas_por_job_id():
    vagas = [vaga("1", "Python Backend"), vaga("2", "Python Backend")]

    resultado = apply_filters(vagas, CONFIG, applied_ids={"1"})

    assert [v.job_id for v in resultado] == ["2"]


def test_mesmo_titulo_e_empresa_com_job_id_diferente_nao_e_ignorado():
    resultado = apply_filters([vaga("2", "Python Backend")], CONFIG, applied_ids={"1"})

    assert len(resultado) == 1


def test_filtra_palavra_bloqueada():
    resultado = apply_filters([vaga("1", "Python Tech Lead")], CONFIG, applied_ids=set())

    assert resultado == []


def test_exige_ao_menos_uma_palavra_obrigatoria():
    resultado = apply_filters([vaga("1", "Java Developer")], CONFIG, applied_ids=set())

    assert resultado == []


def test_sem_palavras_obrigatorias_configuradas_tudo_passa():
    resultado = apply_filters([vaga("1", "Qualquer")], {"required_keywords": []}, applied_ids=set())

    assert len(resultado) == 1

import pytest

from bot.domain.processar import processar_vaga
from bot.domain.status import Status
from bot.domain.vaga import Vaga


class FakeLinkedIn:
    """Adaptador LinkedIn falso: registra as chamadas e simula falhas."""

    def __init__(self, confirma_envio=True, falha_em=None):
        self.confirma_envio = confirma_envio
        self.falha_em = falha_em
        self.chamadas = []

    def _passo(self, nome):
        self.chamadas.append(nome)
        if self.falha_em == nome:
            raise RuntimeError(f"falha em {nome}")

    def abrir_formulario(self, vaga):
        self._passo("abrir_formulario")

    def preencher_formulario(self):
        self._passo("preencher_formulario")

    def enviar(self):
        self._passo("enviar")

    def envio_confirmado(self):
        self._passo("envio_confirmado")
        return self.confirma_envio

    def descartar_formulario(self):
        self._passo("descartar_formulario")


@pytest.fixture
def vaga(repo):
    v = Vaga("1", "Python Dev", "Acme", "Remote")
    repo.upsert_vaga(v)
    repo.record_status("1", Status.VISTA)
    return v


def sempre(_vaga):
    return True


def nunca(_vaga):
    return False


def test_vaga_ja_enviada_e_ignorada_sem_tocar_no_linkedin(repo, vaga):
    for status in (Status.FORMULARIO_ABERTO, Status.ENVIADA):
        repo.record_status("1", status)
    linkedin = FakeLinkedIn()

    resultado = processar_vaga(vaga, repo, linkedin, "auto", sempre)

    assert resultado == Status.ENVIADA
    assert linkedin.chamadas == []
    assert repo.status_history("1") == [Status.VISTA, Status.FORMULARIO_ABERTO, Status.ENVIADA]


def test_modo_auto_envia_sozinho_e_so_vira_enviada_com_confirmacao(repo, vaga):
    linkedin = FakeLinkedIn(confirma_envio=True)

    resultado = processar_vaga(vaga, repo, linkedin, "auto", nunca)

    assert resultado == Status.ENVIADA
    assert repo.current_status("1") == Status.ENVIADA
    assert repo.status_history("1") == [Status.VISTA, Status.FORMULARIO_ABERTO, Status.ENVIADA]


def test_clicar_em_enviar_sem_confirmacao_do_linkedin_vira_falhou(repo, vaga):
    linkedin = FakeLinkedIn(confirma_envio=False)

    resultado = processar_vaga(vaga, repo, linkedin, "auto", sempre)

    assert resultado == Status.FALHOU
    assert repo.current_status("1") == Status.FALHOU
    assert Status.ENVIADA not in repo.status_history("1")


def test_modo_confirmar_aprovado_envia(repo, vaga):
    linkedin = FakeLinkedIn()

    resultado = processar_vaga(vaga, repo, linkedin, "confirmar", sempre)

    assert resultado == Status.ENVIADA
    assert "enviar" in linkedin.chamadas


def test_modo_confirmar_recusado_nao_envia_e_descarta_o_formulario(repo, vaga):
    linkedin = FakeLinkedIn()

    resultado = processar_vaga(vaga, repo, linkedin, "confirmar", nunca)

    assert resultado == Status.FORMULARIO_ABERTO
    assert "enviar" not in linkedin.chamadas
    assert linkedin.chamadas[-1] == "descartar_formulario"
    assert repo.current_status("1") == Status.FORMULARIO_ABERTO


def test_modo_confirmar_pede_aprovacao_so_depois_de_preencher(repo, vaga):
    linkedin = FakeLinkedIn()
    visto = []

    def aprovar(v):
        visto.append(list(linkedin.chamadas))
        return True

    processar_vaga(vaga, repo, linkedin, "confirmar", aprovar)

    assert visto == [["abrir_formulario", "preencher_formulario"]]


def test_modo_auto_nao_pede_aprovacao(repo, vaga):
    def aprovar(v):
        raise AssertionError("não deveria pedir aprovação no modo auto")

    assert processar_vaga(vaga, repo, FakeLinkedIn(), "auto", aprovar) == Status.ENVIADA


@pytest.mark.parametrize("passo", ["abrir_formulario", "preencher_formulario", "enviar"])
def test_erro_no_adaptador_vira_falhou_e_nao_propaga(repo, vaga, passo):
    linkedin = FakeLinkedIn(falha_em=passo)

    resultado = processar_vaga(vaga, repo, linkedin, "auto", sempre)

    assert resultado == Status.FALHOU
    assert repo.current_status("1") == Status.FALHOU


def test_vaga_que_falhou_pode_ser_tentada_de_novo(repo, vaga):
    processar_vaga(vaga, repo, FakeLinkedIn(falha_em="enviar"), "auto", sempre)

    resultado = processar_vaga(vaga, repo, FakeLinkedIn(), "auto", sempre)

    assert resultado == Status.ENVIADA


def test_modo_invalido_e_rejeitado(repo, vaga):
    with pytest.raises(ValueError):
        processar_vaga(vaga, repo, FakeLinkedIn(), "talvez", sempre)

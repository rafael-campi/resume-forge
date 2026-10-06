import uuid
from pathlib import Path

import psycopg
import pytest

from bot.config import ConfigInvalida, carregar_config
from bot.curriculos import criar_curriculos
from bot.curriculos.fixo import PdfFixoCurriculos
from bot.curriculos.forge import CurriculosForge
from bot.domain.curriculo import CurriculoIndisponivel, MotivoIndisponivel
from bot.domain.processar import processar_vaga
from bot.domain.status import Status
from bot.domain.vaga import Vaga
from tests.test_processar_vaga import FakeLinkedIn, sempre

# As tabelas forge_* são do resume-forge: aqui usamos as migrações reais dele, num schema temporário.
MIGRACOES_FORGE = Path(__file__).resolve().parents[2] / "resume-forge" / "migrations"
VAGA = Vaga("4002", "Python Dev", "Beta", "Remote")


@pytest.fixture
def forge(test_database):
    schema = f"forge_t_{uuid.uuid4().hex[:8]}"
    with psycopg.connect(test_database, autocommit=True) as conexao:
        conexao.execute(f"CREATE SCHEMA {schema}")
        conexao.execute(f"SET search_path TO {schema}")
        for sql in sorted(MIGRACOES_FORGE.glob("*.sql")):
            conexao.execute(sql.read_text(encoding="utf-8"))
        yield conexao
        conexao.execute(f"DROP SCHEMA {schema} CASCADE")


def exportar(conexao, job_id, pdf, paginas=1):
    """Grava uma exportação como o resume-forge grava: vaga, geração e PDF."""
    vaga_id = conexao.execute(
        "INSERT INTO forge_vagas (texto, job_id, estado) VALUES ('x', %s, 'pronta') RETURNING id", (job_id,)
    ).fetchone()[0]
    geracao_id = conexao.execute(
        "INSERT INTO forge_geracoes (vaga_id, selecao, modelo) VALUES (%s, '{}', 'm') RETURNING id", (vaga_id,)
    ).fetchone()[0]
    return conexao.execute(
        "INSERT INTO forge_exportacoes (vaga_id, geracao_id, paginas, arquivo, pdf, instantaneo) "
        "VALUES (%s, %s, %s, 'curriculo.pdf', %s, '{}') RETURNING id",
        (vaga_id, geracao_id, paginas, pdf),
    ).fetchone()[0]


def test_devolve_o_pdf_exportado_para_o_job_id_da_vaga(forge, tmp_path):
    exportar(forge, "4002", b"%PDF-1.4 do resume-forge")

    caminho = CurriculosForge(forge, tmp_path).para(VAGA)

    assert caminho.parent == tmp_path
    assert caminho.read_bytes() == b"%PDF-1.4 do resume-forge"


def test_usa_a_exportacao_mais_recente(forge, tmp_path):
    exportar(forge, "4002", b"%PDF antigo")
    exportar(forge, "4002", b"%PDF novo")

    assert CurriculosForge(forge, tmp_path).para(VAGA).read_bytes() == b"%PDF novo"


def test_nao_usa_o_pdf_de_outra_vaga(forge, tmp_path):
    exportar(forge, "9999", b"%PDF de outra vaga")
    exportar(forge, "4002", b"%PDF certo")

    assert CurriculosForge(forge, tmp_path).para(VAGA).read_bytes() == b"%PDF certo"


def test_sem_pdf_exportado_a_vaga_espera_a_revisao(forge, tmp_path):
    with pytest.raises(CurriculoIndisponivel) as erro:
        CurriculosForge(forge, tmp_path).para(VAGA)

    assert erro.value.motivo == MotivoIndisponivel.REVISAO_PENDENTE
    assert "resume-forge" in str(erro.value)


def test_chamar_de_novo_devolve_o_mesmo_arquivo(forge, tmp_path):
    exportar(forge, "4002", b"%PDF-1.4")
    curriculos = CurriculosForge(forge, tmp_path)

    assert curriculos.para(VAGA) == curriculos.para(VAGA)


def test_um_pdf_reexportado_vira_outro_arquivo_sem_sobrescrever_o_anterior(forge, tmp_path):
    exportar(forge, "4002", b"%PDF antigo")
    curriculos = CurriculosForge(forge, tmp_path)
    antigo = curriculos.para(VAGA)
    exportar(forge, "4002", b"%PDF novo")

    novo = curriculos.para(VAGA)

    assert novo != antigo
    assert antigo.read_bytes() == b"%PDF antigo"


def test_sem_as_tabelas_do_resume_forge_a_falha_e_clara_e_a_conexao_segue_utilizavel(conn, tmp_path):
    with pytest.raises(CurriculoIndisponivel) as erro:
        CurriculosForge(conn, tmp_path).para(VAGA)

    assert erro.value.motivo == MotivoIndisponivel.FORGE_INDISPONIVEL
    assert conn.execute("SELECT 1").fetchone() == (1,)


def test_sem_pdf_exportado_a_candidatura_vai_para_revisao_manual_sem_abrir_o_formulario(repo, conn, forge, tmp_path):
    repo.upsert_vaga(VAGA)
    repo.record_status("4002", Status.VISTA)
    linkedin = FakeLinkedIn()

    resultado = processar_vaga(VAGA, repo, linkedin, CurriculosForge(forge, tmp_path), "auto", sempre)

    assert resultado == Status.REVISAO_MANUAL
    assert linkedin.chamadas == []


def test_com_pdf_exportado_o_formulario_recebe_esse_arquivo(repo, conn, forge, tmp_path):
    repo.upsert_vaga(VAGA)
    repo.record_status("4002", Status.VISTA)
    exportar(forge, "4002", b"%PDF-1.4")
    linkedin = FakeLinkedIn()

    resultado = processar_vaga(VAGA, repo, linkedin, CurriculosForge(forge, tmp_path), "auto", sempre)

    assert resultado == Status.ENVIADA
    assert linkedin.curriculo.read_bytes() == b"%PDF-1.4"


def test_a_fonte_do_curriculo_vem_da_configuracao(conn):
    assert carregar_config({})["apply"]["curriculo"] == "fixo"
    fixo = criar_curriculos(carregar_config({"apply": {"resume_path": "a.pdf"}}), conn)
    forge = criar_curriculos(carregar_config({"apply": {"curriculo": "forge"}}), conn)

    assert isinstance(fixo, PdfFixoCurriculos)
    assert isinstance(forge, CurriculosForge)


def test_fonte_desconhecida_e_rejeitada():
    with pytest.raises(ConfigInvalida, match="curriculo"):
        carregar_config({"apply": {"curriculo": "magia"}})

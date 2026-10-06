from pathlib import Path

from bot.curriculos.fixo import PdfFixoCurriculos
from bot.domain.vaga import Vaga

VAGA = Vaga("1", "Python Dev", "Acme", "Remote")


def test_pdf_fixo_devolve_o_mesmo_caminho_para_qualquer_vaga():
    curriculos = PdfFixoCurriculos("storage/curriculo.pdf")

    outra = Vaga("2", "Outra", "Beta", "SP")
    assert curriculos.para(VAGA) == curriculos.para(outra) == Path("storage/curriculo.pdf")


def test_pdf_fixo_nao_exige_que_o_arquivo_exista():
    # o adaptador LinkedIn só precisa do arquivo se o formulário pedir currículo
    assert PdfFixoCurriculos("nao/existe.pdf").para(VAGA) == Path("nao/existe.pdf")


def test_pdf_fixo_sem_caminho_configurado_nao_tem_curriculo_proprio():
    assert PdfFixoCurriculos("").para(VAGA) is None

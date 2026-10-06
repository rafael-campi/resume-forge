"""
bot/linkedin/gravacao.py
Gravação: salva snapshots de DOM de cada passo (lista, Vaga, formulário,
confirmação) para testar os seletores sem acessar o LinkedIn. Roda manualmente
via gravar.py, uma vez, no modo confirmar. O HTML é sanitizado antes de salvar,
para não guardar dados pessoais.
"""

import re
from pathlib import Path

from bs4 import BeautifulSoup

# Áreas da página que carregam dados do dono da conta, não da Vaga.
_REMOVER = (
    "script", "style", "noscript", "iframe", "svg", "img", "code",
    ".global-nav", "header#global-nav", ".msg-overlay-container",
    ".feed-identity-module", ".scaffold-layout__aside",
)
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_TELEFONE = re.compile(r"\+?\d[\d\s().-]{7,}\d")
_ATRIBUTOS_PESSOAIS = ("value", "src", "srcset", "style", "data-chameleon-result-urn")


def sanitizar(html):
    """Remove scripts, imagens, navegação, valores de campos, e-mails e telefones."""
    soup = BeautifulSoup(html, "html.parser")
    for seletor in _REMOVER:
        for node in soup.select(seletor):
            node.decompose()
    for node in soup.find_all(True):
        for atributo in _ATRIBUTOS_PESSOAIS:
            if atributo in node.attrs:
                if atributo == "value" and node.name == "option":
                    continue
                del node.attrs[atributo]
    for texto in soup.find_all(string=True):
        limpo = _TELEFONE.sub("[telefone]", _EMAIL.sub("[email]", str(texto)))
        if limpo != str(texto):
            texto.replace_with(limpo)
    return str(soup)


def salvar_snapshot(driver, pasta, nome):
    """Sanitiza o page_source atual e grava em <pasta>/<nome>.html."""
    destino = Path(pasta)
    destino.mkdir(parents=True, exist_ok=True)
    caminho = destino / f"{nome}.html"
    caminho.write_text(sanitizar(driver.page_source), encoding="utf-8")
    return caminho

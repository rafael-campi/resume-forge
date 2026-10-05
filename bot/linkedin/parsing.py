"""
bot/linkedin/parsing.py
Leitura do HTML do LinkedIn (lista de Vagas e estado do formulário Easy Apply).
Funções puras sobre texto HTML: o adaptador Selenium as aplica ao page_source e
os testes as aplicam aos snapshots de tests/fixtures/. Sem regra de negócio.
"""

import re

from bs4 import BeautifulSoup

from bot.domain.vaga import Vaga
from bot.linkedin import selectors as sel


def _soup(html):
    return BeautifulSoup(html, "html.parser")


def _text(node, selector):
    found = node.select_one(selector)
    return " ".join(found.get_text().split()) if found else ""


def extract_job_id(card):
    """Lê o job id de um card (atributo data-job-id ou link /jobs/view/<id>); None se não achar."""
    job_id = (card.get("data-job-id") or "").strip()
    if job_id:
        return job_id
    link = card.select_one(sel.CARD_LINK)
    match = re.search(r"/jobs/view/(\d+)", link.get("href", "") if link else "")
    return match.group(1) if match else None


def parse_vagas(html):
    """Vagas da lista de resultados. Cards sem job id são ignorados; repetidos, deduplicados."""
    vagas, vistos = [], set()
    for card in _soup(html).select(sel.CARD):
        job_id = extract_job_id(card)
        if not job_id or job_id in vistos:
            continue
        vistos.add(job_id)
        vagas.append(
            Vaga(
                job_id=job_id,
                title=_text(card, sel.CARD_TITLE),
                company=_text(card, sel.CARD_COMPANY),
                location=_text(card, sel.CARD_LOCATION),
            )
        )
    return vagas


def parse_descricao(html):
    """Texto da descrição na página da Vaga; '' se não achar."""
    return _text(_soup(html), sel.DESCRIPTION)


def tem_easy_apply(html):
    return _soup(html).select_one(sel.EASY_APPLY_BUTTON) is not None


def formulario_aberto(html):
    return _soup(html).select_one(sel.MODAL) is not None


def passo_do_formulario(html):
    """'enviar' (passo de revisão), 'revisar', 'avancar' ou None se não há formulário."""
    soup = _soup(html)
    if soup.select_one(sel.SUBMIT_BUTTON):
        return "enviar"
    if soup.select_one(sel.REVIEW_BUTTON):
        return "revisar"
    if soup.select_one(sel.NEXT_BUTTON):
        return "avancar"
    return None


def precisa_de_curriculo(html):
    """True se o passo pede upload de currículo e nenhum está anexado."""
    soup = _soup(html)
    return soup.select_one(sel.RESUME_INPUT) is not None and soup.select_one(sel.RESUME_ATTACHED) is None


def campos_vazios(html):
    """Rótulos dos campos obrigatórios ainda sem valor no passo atual do formulário."""
    vazios = []
    for field in _soup(html).select(f"{sel.MODAL} {sel.FORM_FIELD}"):
        campo = field.select_one(sel.FORM_FIELD_INPUT)
        if campo is None or not (campo.get("required") is not None or campo.get("aria-required") == "true"):
            continue
        if campo.name == "select":
            escolhida = campo.select_one("option[selected]")
            valor = escolhida.get("value", "") if escolhida else ""
            if valor.lower().startswith("select") or valor.lower().startswith("selecion"):
                valor = ""
        elif campo.name == "textarea":
            valor = campo.get_text().strip()
        else:
            valor = (campo.get("value") or "").strip()
        if not valor:
            vazios.append(_text(field, "label") or "(sem rótulo)")
    return vazios


def envio_confirmado(html):
    """True só se o LinkedIn mostra a confirmação de candidatura enviada."""
    modal = _soup(html).select_one(sel.CONFIRMATION)
    return modal is not None and sel.CONFIRMATION_TEXT in modal.get_text().lower()

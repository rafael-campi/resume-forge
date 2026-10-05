"""
bot/linkedin/search.py
Busca Vagas no LinkedIn pela URL de resultados e lê os cards da lista.
"""

from urllib.parse import urlencode

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from bot.linkedin import parsing
from bot.linkedin import selectors as sel

SEARCH_URL = "https://www.linkedin.com/jobs/search/?"


def build_search_url(config):
    params = {
        "keywords": config["search"]["keywords"],
        "location": config["search"]["location"],
    }
    if config["apply"]["easy_apply_only"]:
        params["f_AL"] = "true"
    return SEARCH_URL + urlencode(params)


def search_jobs(driver, config):
    """
    Busca Vagas conforme o config.

    Returns:
        list[Vaga]: Vagas da lista de resultados (sem filtros aplicados), pelo Job id
    """
    url = build_search_url(config)
    print(f"Buscando: {url}")
    driver.get(url)
    try:
        WebDriverWait(driver, config["browser"]["timeout"]).until(
            lambda d: d.find_elements(By.CSS_SELECTOR, sel.CARD)
        )
    except Exception:
        pass  # sem cards no prazo: o parse abaixo devolve lista vazia e avisa

    vagas = parsing.parse_vagas(driver.page_source)
    if not vagas:
        print("⚠️  Nenhuma vaga encontrada (termos específicos, sessão expirada ou HTML mudou)")
    for i, vaga in enumerate(vagas, 1):
        print(f"  {i}. [{vaga.job_id}] {vaga.title or '(sem título)'} - {vaga.company or '(sem empresa)'}")
    return vagas

"""
bot/linkedin/search.py
Busca Vagas no LinkedIn pela URL de resultados e lê os cards da lista.
"""

import time
from urllib.parse import urlencode

from bot.linkedin import parsing

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
    time.sleep(5)

    vagas = parsing.parse_vagas(driver.page_source)
    if not vagas:
        print("⚠️  Nenhuma vaga encontrada (termos específicos, sessão expirada ou HTML mudou)")
    for i, vaga in enumerate(vagas, 1):
        print(f"  {i}. [{vaga.job_id}] {vaga.title or '(sem título)'} - {vaga.company or '(sem empresa)'}")
    return vagas

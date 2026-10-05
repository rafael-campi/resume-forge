"""
main.py
Ponto de entrada principal do bot de automação do LinkedIn.
Coordena a execução das diferentes funcionalidades do bot.
"""

import yaml
from dotenv import load_dotenv

from bot.domain.filters import apply_filters
from bot.domain.status import Status
from bot.linkedin.apply import apply_to_jobs
from bot.linkedin.browser import Browser
from bot.linkedin.login import login
from bot.linkedin.search import search_jobs
from bot.repository.db import connect, migrate
from bot.repository.repository import Repository


def load_config():
    """Carrega configurações do arquivo config.yaml"""
    with open('config.yaml', 'r') as file:
        return yaml.safe_load(file)


def register_and_filter(repo, vagas_listadas, config):
    """
    Grava as Vagas encontradas, aplica os filtros e marca como filtradas as que não passaram.
    Uma Vaga filtrada antes volta a ser vista e é reavaliada com a configuração atual.

    Returns:
        list[VagaListada]: Vagas que passaram pelos filtros
    """
    enviadas_ids = repo.enviada_job_ids()
    for listed in vagas_listadas:
        job_id = listed.vaga.job_id
        repo.upsert_vaga(listed.vaga)
        if repo.current_status(job_id) in (None, Status.FILTRADA):
            repo.record_status(job_id, Status.VISTA)

    kept = apply_filters(
        [listed.vaga for listed in vagas_listadas], config.get('filters', {}), enviadas_ids
    )
    kept_ids = {vaga.job_id for vaga in kept}

    for listed in vagas_listadas:
        job_id = listed.vaga.job_id
        if job_id not in kept_ids and repo.current_status(job_id) == Status.VISTA:
            repo.record_status(job_id, Status.FILTRADA)

    return [listed for listed in vagas_listadas if listed.vaga.job_id in kept_ids]


def main():
    """Função principal que executa o fluxo do bot"""
    print("Iniciando bot de automação do LinkedIn...")
    print("=" * 50)

    load_dotenv()
    config = load_config()
    print("✓ Configurações carregadas")

    conn = connect()
    migrate(conn)
    repo = Repository(conn)
    print("✓ Banco de dados pronto")

    browser = Browser()
    driver = browser.start()

    try:
        print("\n[ETAPA 1] Iniciando login no LinkedIn...")
        print("=" * 50)
        login(driver, config)

        print("\n[ETAPA 2] Buscando vagas...")
        print("=" * 50)
        vagas_listadas = search_jobs(driver, config)
        jobs = register_and_filter(repo, vagas_listadas, config)
        print(f"✓ {len(jobs)} vagas após aplicar filtros")

        print("\n[ETAPA 3] Aplicando para vagas...")
        print("=" * 50)
        apply_to_jobs(driver, jobs, config, repo)

    except KeyboardInterrupt:
        print("\n\n⚠️  Execução interrompida pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro durante execução: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        browser.quit()
        conn.close()
        print("\n" + "=" * 50)
        print("Bot finalizado.")
        print("=" * 50)


if __name__ == "__main__":
    main()

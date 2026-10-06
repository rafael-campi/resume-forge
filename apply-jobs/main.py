"""
main.py
Ponto de entrada principal do bot de automação do LinkedIn.
Coordena a execução das diferentes funcionalidades do bot.
"""

import time

from dotenv import load_dotenv

from bot.config import ler_config
from bot.curriculos.fixo import PdfFixoCurriculos
from bot.domain.filters import apply_filters
from bot.domain.processar import processar_vaga
from bot.domain.status import Status
from bot.linkedin.adapter import LinkedInAdapter
from bot.linkedin.browser import Browser
from bot.linkedin.login import login
from bot.linkedin.search import search_jobs
from bot.repository.db import connect, migrate
from bot.repository.repository import Repository


def register_and_filter(repo, vagas, config):
    """
    Grava as Vagas encontradas, aplica os filtros e marca como filtradas as que não passaram.
    Uma Vaga filtrada antes volta a ser vista e é reavaliada com a configuração atual.

    Returns:
        list[Vaga]: Vagas que passaram pelos filtros
    """
    enviadas_ids = repo.enviada_job_ids()
    for vaga in vagas:
        job_id = vaga.job_id
        repo.upsert_vaga(vaga)
        if repo.current_status(job_id) in (None, Status.FILTRADA):
            repo.record_status(job_id, Status.VISTA)

    kept = apply_filters(vagas, config.get('filters', {}), enviadas_ids)
    kept_ids = {vaga.job_id for vaga in kept}

    for vaga in vagas:
        job_id = vaga.job_id
        if job_id not in kept_ids and repo.current_status(job_id) == Status.VISTA:
            repo.record_status(job_id, Status.FILTRADA)

    return [vaga for vaga in vagas if vaga.job_id in kept_ids]


def aprovar_no_terminal(vaga):
    """Modo confirmar: o formulário está preenchido no navegador; o dono decide o envio."""
    resposta = input(f"\nEnviar a candidatura para [{vaga.job_id}] {vaga.title} - {vaga.company}? [s/N] ")
    return resposta.strip().lower() in ("s", "sim")


def apply_to_jobs(vagas, repo, linkedin, curriculos, config):
    """
    Processa as Vagas até o limite de Candidaturas Enviadas da execução.
    O erro em uma Vaga não interrompe as demais.
    """
    modo = config['apply']['mode']
    limite = config['apply']['max_applications']
    enviadas = 0

    for vaga in vagas:
        if enviadas >= limite:
            print(f"✓ Limite de {limite} candidaturas atingido")
            break
        print(f"\nProcessando: [{vaga.job_id}] {vaga.title} - {vaga.company}")
        try:
            status = processar_vaga(vaga, repo, linkedin, curriculos, modo, aprovar_no_terminal)
        except Exception as erro:
            print(f"❌ Erro inesperado em {vaga.job_id}: {erro}")
            continue
        print(f"→ Status: {status.value}")
        if status == Status.ENVIADA:
            enviadas += 1
            time.sleep(config['apply']['delay_between_applications'])

    print(f"✓ Candidaturas enviadas: {enviadas}")


def main():
    """Função principal que executa o fluxo do bot"""
    print("Iniciando bot de automação do LinkedIn...")
    print("=" * 50)

    load_dotenv()
    config = ler_config()
    print("✓ Configurações carregadas")

    conn = connect()
    migrate(conn)
    repo = Repository(conn)
    print("✓ Banco de dados pronto")

    browser = Browser(
        headless=config['browser']['headless'], language=config['browser']['language']
    )
    driver = browser.start()

    try:
        print("\n[ETAPA 1] Iniciando login no LinkedIn...")
        print("=" * 50)
        login(driver, config)

        print("\n[ETAPA 2] Buscando vagas...")
        print("=" * 50)
        encontradas = search_jobs(driver, config)
        vagas = register_and_filter(repo, encontradas, config)
        print(f"✓ {len(vagas)} vagas após aplicar filtros")

        print("\n[ETAPA 3] Aplicando para vagas...")
        print("=" * 50)
        curriculos = PdfFixoCurriculos(config['apply']['resume_path'])
        apply_to_jobs(vagas, repo, LinkedInAdapter(driver, config), curriculos, config)

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

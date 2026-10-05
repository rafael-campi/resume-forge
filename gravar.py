"""
gravar.py
Gravação manual de snapshots de DOM (sanitizados, sem dados pessoais) para testar
os seletores do adaptador. Rode uma vez, com conta logada, no modo confirmar:

    .venv/bin/python gravar.py

O script abre a busca e uma Vaga Easy Apply e, a cada passo, espera você deixar o
navegador no estado certo e apertar Enter para salvar. Nunca envia a candidatura:
no último passo, descarte o formulário. Os arquivos vão para storage/gravacao/;
copie-os para tests/fixtures/ (veja o README de lá).
"""

from dotenv import load_dotenv

from bot.config import ler_config
from bot.linkedin.browser import Browser
from bot.linkedin.gravacao import salvar_snapshot
from bot.linkedin.login import login
from bot.linkedin.search import build_search_url

PASTA = "storage/gravacao"
PASSOS = [
    ("lista_vagas", "Resultados da busca visíveis"),
    ("vaga_easy_apply", "Abra uma Vaga com Candidatura simplificada (botão visível, ainda sem clicar)"),
    ("formulario_contato", "Clique em Candidatura simplificada: primeiro passo do formulário"),
    ("formulario_curriculo", "Avance até o passo do currículo"),
    ("formulario_revisao", "Avance até 'Revise sua candidatura' (NÃO envie)"),
    ("vaga_sem_easy_apply", "Opcional: abra uma Vaga SEM Candidatura simplificada"),
]


def main():
    load_dotenv()
    config = ler_config()
    if config["apply"]["mode"] != "confirmar" or config["browser"]["headless"]:
        raise SystemExit("A Gravação exige apply.mode: confirmar e browser.headless: false")

    browser = Browser(headless=False, language=config["browser"]["language"])
    driver = browser.start()
    try:
        login(driver, config)
        driver.get(build_search_url(config))
        for nome, instrucao in PASSOS:
            input(f"\n[{nome}] {instrucao}. Enter para salvar... ")
            print(f"✓ {salvar_snapshot(driver, PASTA, nome)}")
        print("\nDescarte o formulário no navegador. Revise os HTMLs antes de copiá-los.")
        input("Enter para fechar... ")
    finally:
        browser.quit()


if __name__ == "__main__":
    main()

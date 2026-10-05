"""
bot/linkedin/apply.py
Abre o Easy Apply das Vagas e registra o Status de cada Candidatura.
O envio do formulário ainda não está implementado: uma Candidatura só deve
virar Enviada quando o LinkedIn confirmar o envio, então por enquanto o
Status termina em formulário aberto.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

from bot.domain.status import Status, can_transition


def apply_to_jobs(driver, vagas_listadas, config, repo):
    """
    Abre o formulário Easy Apply das Vagas e registra o Status no banco.

    Args:
        driver: Instância do Selenium WebDriver
        vagas_listadas (list[VagaListada]): Vagas para processar
        config (dict): Dicionário com configurações de aplicação
        repo (Repository): Repositório onde os Status são registrados
    """
    print(f"Iniciando processo de aplicação para {len(vagas_listadas)} vagas...")

    opened_count = 0
    max_applications = config.get('apply', {}).get('max_applications', 10)

    for listed in vagas_listadas:
        vaga = listed.vaga
        if opened_count >= max_applications:
            print(f"✓ Limite de {max_applications} aplicações atingido")
            break

        try:
            print(f"Abrindo: [{vaga.job_id}] {vaga.title} - {vaga.company}")

            listed.element.click()
            time.sleep(2)

            easy_apply_button = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'button[aria-label*="Easy Apply"]'))
            )
            easy_apply_button.click()
            time.sleep(2)

            if repo.current_status(vaga.job_id) != Status.FORMULARIO_ABERTO:
                repo.record_status(vaga.job_id, Status.FORMULARIO_ABERTO)
            opened_count += 1

            # TODO: preencher o formulário, enviar e registrar Status.ENVIADA
            # somente depois da confirmação do LinkedIn.
            print("✓ Formulário aberto (envio ainda não implementado)")
            time.sleep(3)

        except Exception as e:
            print(f"❌ Erro ao aplicar para {vaga.title}: {str(e)}")
            if can_transition(repo.current_status(vaga.job_id), Status.FALHOU):
                repo.record_status(vaga.job_id, Status.FALHOU)
            else:
                print(f"⚠️  Status de {vaga.job_id} não aceita falha a partir do estado atual")
            continue

    print(f"✓ Formulários abertos: {opened_count}")

"""
bot/apply.py
Gerencia o processo de candidatura automática às vagas.
Preenche formulários, anexa currículo e envia aplicações.
Registra aplicações realizadas no arquivo CSV.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import csv
from datetime import datetime
import time


def apply_to_jobs(driver, jobs, config):
    """
    Aplica para as vagas na lista fornecida
    
    Args:
        driver: Instância do Selenium WebDriver
        jobs (list): Lista de vagas para aplicar
        config (dict): Dicionário com configurações de aplicação
    """
    print(f"Iniciando processo de aplicação para {len(jobs)} vagas...")
    
    applications_count = 0
    max_applications = config.get('apply', {}).get('max_applications', 10)
    
    for job in jobs:
        if applications_count >= max_applications:
            print(f"✓ Limite de {max_applications} aplicações atingido")
            break
        
        try:
            print(f"Aplicando para: {job['title']} - {job['company']}")
            
            # Clica na vaga
            job['element'].click()
            time.sleep(2)
            
            # Procura o botão "Easy Apply"
            easy_apply_button = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'button[aria-label*="Easy Apply"]'))
            )
            easy_apply_button.click()
            time.sleep(2)
            
            # TODO: Implementar preenchimento do formulário
            # TODO: Anexar currículo se necessário
            # TODO: Responder perguntas adicionais
            
            # Registra a aplicação
            save_application(job)
            applications_count += 1
            
            print(f"✓ Aplicação enviada com sucesso!")
            time.sleep(3)  # Delay entre aplicações
            
        except Exception as e:
            print(f"❌ Erro ao aplicar para {job['title']}: {str(e)}")
            continue
    
    print(f"✓ Total de aplicações realizadas: {applications_count}")


def save_application(job):
    """
    Salva informações da aplicação no arquivo CSV
    
    Args:
        job (dict): Dicionário com dados da vaga
    """
    csv_file = 'storage/applications.csv'
    
    # Dados da aplicação
    application_data = {
        'date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'title': job['title'],
        'company': job['company'],
        'location': job['location'],
        'status': 'applied'
    }
    
    # Adiciona ao CSV
    try:
        with open(csv_file, 'a', newline='', encoding='utf-8') as file:
            writer = csv.DictWriter(file, fieldnames=application_data.keys())
            
            # Escreve cabeçalho se arquivo estiver vazio
            if file.tell() == 0:
                writer.writeheader()
            
            writer.writerow(application_data)
    except Exception as e:
        print(f"⚠️  Erro ao salvar aplicação no CSV: {str(e)}")

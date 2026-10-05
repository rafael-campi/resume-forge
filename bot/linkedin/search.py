"""
bot/search.py
Realiza buscas de vagas no LinkedIn com base em critérios definidos.
Navega pelos resultados, coleta informações das vagas e aplica filtros.
Retorna lista de vagas que atendem aos critérios configurados.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from dataclasses import dataclass
from typing import Any
import re
import time

from bot.domain.vaga import Vaga


@dataclass
class ListedJob:
    """Uma Vaga lida da lista de resultados, com o elemento do card para interagir."""
    vaga: Vaga
    element: Any


def extract_job_id(card):
    """Lê o job id do card (atributo data-job-id ou link /jobs/view/<id>); None se não achar."""
    job_id = card.get_attribute('data-job-id')
    if job_id:
        return job_id.strip()
    try:
        href = card.find_element(By.CSS_SELECTOR, 'a[href*="/jobs/view/"]').get_attribute('href')
    except Exception:
        return None
    match = re.search(r'/jobs/view/(\d+)', href or '')
    return match.group(1) if match else None


def search_jobs(driver, config):
    """
    Busca vagas no LinkedIn baseado nas configurações
    
    Args:
        driver: Instância do Selenium WebDriver
        config (dict): Dicionário com configurações de busca
        
    Returns:
        list[ListedJob]: Vagas encontradas na lista de resultados (sem filtros aplicados)
    """
    print("Buscando vagas no LinkedIn...")
    
    try:
        # Verifica se o driver está ativo
        current_url = driver.current_url
        print(f"URL atual: {current_url}")
    except Exception as e:
        print(f"❌ Navegador não está ativo: {str(e)}")
        return []
    
    # Parâmetros de busca do config
    keywords = config.get('search', {}).get('keywords', '')
    location = config.get('search', {}).get('location', '')
    
    print(f"Buscando por: '{keywords}' em '{location}'")
    
    try:
        # Acessa a página de vagas
        print("Acessando página de vagas...")
        driver.get('https://www.linkedin.com/jobs/')
        time.sleep(3)
        
        print(f"Página carregada: {driver.title}")
        
        # Tenta encontrar o campo de busca com vários seletores possíveis
        keyword_field = None
        selectors = [
            'input[placeholder="Cargo, competência ou empresa"]',
            'input[placeholder*="Cargo"]',
            'input[aria-label*="Search by title"]',
            'input[aria-label*="Search"]',
            'input.jobs-search-box__text-input',
            'input[placeholder*="Search"]'
        ]
        
        for selector in selectors:
            try:
                keyword_field = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                print(f"✓ Campo de busca encontrado: {selector}")
                break
            except:
                continue
        
        if not keyword_field:
            print("❌ Não foi possível encontrar o campo de busca")
            print("💡 Dica: Verifique se você está logado no LinkedIn")
            # Tira screenshot para debug
            driver.save_screenshot('storage/debug_search_error.png')
            print("📸 Screenshot salvo em: storage/debug_search_error.png")
            return []
        
        # Preenche e busca
        print("Preenchendo campos de busca...")
        keyword_field.clear()
        keyword_field.send_keys(keywords)
        time.sleep(1)
        
        # Tenta encontrar campo de localização
        try:
            location_field = driver.find_element(By.CSS_SELECTOR, 'input[aria-label*="City"]')
            location_field.clear()
            location_field.send_keys(location)
        except:
            print("⚠️  Campo de localização não encontrado, continuando...")
        
        # Envia a busca
        keyword_field.send_keys(Keys.ENTER)
        print("Aguardando resultados...")
        time.sleep(5)
        
        # Coleta as vagas da página
        jobs = []
        job_selectors = [
            '.job-card-container',
            '.jobs-search-results__list-item',
            '[data-job-id]'
        ]
        
        job_cards = []
        for selector in job_selectors:
            try:
                job_cards = driver.find_elements(By.CSS_SELECTOR, selector)
                if job_cards:
                    print(f"✓ Vagas encontradas usando seletor: {selector}")
                    break
            except:
                continue
        
        print(f"Encontradas {len(job_cards)} vagas na primeira página")
        
        if len(job_cards) == 0:
            print("⚠️  Nenhuma vaga encontrada. Possíveis razões:")
            print("   - Termos de busca muito específicos")
            print("   - Sessão expirada")
            print("   - Estrutura da página mudou")
            driver.save_screenshot('storage/debug_no_jobs.png')
            print("📸 Screenshot salvo em: storage/debug_no_jobs.png")
        
        for i, card in enumerate(job_cards[:10], 1):  # Limita a 10 primeiras vagas
            try:
                # Tenta extrair informações da vaga
                title = "Título não disponível"
                company = "Empresa não disponível"
                location_text = "Localização não disponível"
                
                try:
                    title = card.find_element(By.CSS_SELECTOR, '.job-card-list__title, .job-card-container__link').text
                except:
                    pass
                
                try:
                    company = card.find_element(By.CSS_SELECTOR, '.job-card-container__company-name, .artdeco-entity-lockup__subtitle').text
                except:
                    pass
                
                try:
                    location_text = card.find_element(By.CSS_SELECTOR, '.job-card-container__metadata-item, .artdeco-entity-lockup__caption').text
                except:
                    pass
                
                job_id = extract_job_id(card)
                if not job_id:
                    print(f"⚠️  Vaga {i} sem job id, ignorada: {title}")
                    continue

                vaga = Vaga(job_id=job_id, title=title, company=company, location=location_text)
                jobs.append(ListedJob(vaga=vaga, element=card))
                print(f"  {i}. [{job_id}] {title} - {company}")
                
            except Exception as e:
                print(f"⚠️  Erro ao coletar dados da vaga {i}: {str(e)}")
                continue
        
        return jobs
        
    except Exception as e:
        print(f"❌ Erro ao buscar vagas: {str(e)}")
        import traceback
        traceback.print_exc()
        try:
            driver.save_screenshot('storage/debug_error.png')
            print("📸 Screenshot salvo em: storage/debug_error.png")
        except:
            pass
        return []

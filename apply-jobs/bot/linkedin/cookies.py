"""
bot/cookies.py
Gerencia salvamento e carregamento de cookies para manter sessão.
Permite pular o login após primeira autenticação bem-sucedida.
"""

import pickle
import os
from datetime import datetime


COOKIES_FILE = 'storage/linkedin_cookies.pkl'


def save_cookies(driver):
    """
    Salva os cookies da sessão atual
    
    Args:
        driver: Instância do Selenium WebDriver
    """
    try:
        # Cria diretório se não existir
        os.makedirs('storage', exist_ok=True)
        
        # Salva os cookies
        cookies = driver.get_cookies()
        with open(COOKIES_FILE, 'wb') as file:
            pickle.dump(cookies, file)
        
        print(f"✓ Cookies salvos em {COOKIES_FILE}")
        return True
    except Exception as e:
        print(f"⚠️  Erro ao salvar cookies: {str(e)}")
        return False


def load_cookies(driver):
    """
    Carrega cookies salvos no navegador
    
    Args:
        driver: Instância do Selenium WebDriver
        
    Returns:
        bool: True se cookies foram carregados, False caso contrário
    """
    try:
        if not os.path.exists(COOKIES_FILE):
            print("ℹ️  Nenhum cookie salvo encontrado")
            return False
        
        # Carrega os cookies
        with open(COOKIES_FILE, 'rb') as file:
            cookies = pickle.load(file)
        
        # Primeiro acessa o LinkedIn para definir o domínio
        driver.get('https://www.linkedin.com')
        
        # Adiciona cada cookie
        for cookie in cookies:
            try:
                # Remove campos que podem causar erro
                cookie.pop('sameSite', None)
                driver.add_cookie(cookie)
            except Exception as e:
                print(f"⚠️  Erro ao adicionar cookie: {str(e)}")
                continue
        
        print("✓ Cookies carregados com sucesso")
        return True
        
    except Exception as e:
        print(f"⚠️  Erro ao carregar cookies: {str(e)}")
        return False


def delete_cookies():
    """Remove arquivo de cookies salvos"""
    try:
        if os.path.exists(COOKIES_FILE):
            os.remove(COOKIES_FILE)
            print("✓ Cookies removidos")
            return True
    except Exception as e:
        print(f"⚠️  Erro ao remover cookies: {str(e)}")
    return False


def is_logged_in(driver):
    """
    Verifica se o usuário está logado no LinkedIn
    
    Args:
        driver: Instância do Selenium WebDriver
        
    Returns:
        bool: True se logado, False caso contrário
    """
    try:
        # Verifica se está na página inicial do LinkedIn logado
        current_url = driver.current_url
        
        # Se estiver na página de feed ou jobs, está logado
        if 'feed' in current_url or 'mynetwork' in current_url or 'jobs' in current_url:
            return True
        
        # Tenta encontrar elemento que só existe quando logado
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        
        try:
            # Procura pelo botão de perfil (indica que está logado)
            WebDriverWait(driver, 3).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, '[data-control-name="identity_profile_photo"]'))
            )
            return True
        except:
            return False
            
    except Exception as e:
        return False

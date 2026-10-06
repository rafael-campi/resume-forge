"""
bot/login.py
Gerencia o processo de autenticação no LinkedIn.
Realiza login usando credenciais do arquivo .env ou config.yaml.
Trata verificações de segurança e captchas quando necessário.
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
from dotenv import load_dotenv
import time
from .cookies import save_cookies, load_cookies, is_logged_in


# Carrega variáveis de ambiente
load_dotenv()


def login(driver, config):
    """
    Realiza o login no LinkedIn
    
    Args:
        driver: Instância do Selenium WebDriver
        config (dict): Dicionário com configurações do bot
    """
    print("Verificando sessão do LinkedIn...")
    
    # Tenta carregar cookies salvos
    if load_cookies(driver):
        # Recarrega a página para aplicar os cookies
        driver.refresh()
        time.sleep(2)
        
        # Verifica se está logado
        if is_logged_in(driver):
            print("✓ Login automático realizado usando cookies salvos!")
            return
        else:
            print("ℹ️  Cookies expirados, fazendo login novamente...")
    
    print("Fazendo login no LinkedIn...")
    
    # Acessa a página de login
    driver.get('https://www.linkedin.com/login')
    time.sleep(2)
    
    try:
        # Obtém credenciais das variáveis de ambiente
        email = os.getenv('LINKEDIN_EMAIL')
        password = os.getenv('LINKEDIN_PASSWORD')
        
        if not email or not password:
            raise ValueError("Credenciais não encontradas nas variáveis de ambiente")
        
        # Aguarda e preenche o campo de email
        email_field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, 'username'))
        )
        email_field.send_keys(email)
        
        # Preenche o campo de senha
        password_field = driver.find_element(By.ID, 'password')
        password_field.send_keys(password)
        
        # Clica no botão de login
        login_button = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
        login_button.click()
        
        # Aguarda o login ser concluído
        time.sleep(3)
        
        # Verifica se há verificação de segurança/captcha
        if "checkpoint" in driver.current_url or "challenge" in driver.current_url:
            print("\n" + "=" * 60)
            print("⚠️  CAPTCHA/VERIFICAÇÃO DE SEGURANÇA DETECTADA")
            print("=" * 60)
            print("\n📋 INSTRUÇÕES:")
            print("   1. Complete o captcha/verificação manualmente no navegador")
            print("   2. Aguarde até chegar na página inicial (Feed)")
            print("   3. Volte aqui e pressione Enter para continuar")
            print("\n💡 DICA: Após esta primeira verificação, os cookies serão")
            print("   salvos e você não precisará fazer login novamente!")
            print("=" * 60)
            input("\nPressione Enter após completar a verificação...")
        
        # Aguarda mais um pouco para garantir que está logado
        time.sleep(2)
        
        # Verifica se o login foi bem-sucedido
        if is_logged_in(driver):
            print("✓ Login realizado com sucesso!")
            
            # Salva cookies para próximas execuções
            print("💾 Salvando sessão...")
            save_cookies(driver)
        else:
            print("⚠️  Login pode não ter sido completado corretamente")
        
    except Exception as e:
        print(f"❌ Erro ao fazer login: {str(e)}")
        raise

"""
bot/browser.py
Gerencia a instância do navegador Selenium (Chrome/Firefox).
Responsável por configurar, inicializar e encerrar o driver do navegador.
Inclui configurações como headless mode, user-agent, etc.
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import os


class Browser:
    """Classe para gerenciar o navegador Selenium"""
    
    def __init__(self, headless=False, language='pt-BR'):
        """
        Inicializa as configurações do navegador
        
        Args:
            headless (bool): Se True, executa o navegador sem interface gráfica
            language (str): Idioma da interface (fixado em português para os seletores)
        """
        self.driver = None
        self.headless = headless
        self.language = language
    
    def start(self):
        """
        Inicia o navegador com as configurações definidas
        
        Returns:
            webdriver: Instância do driver do Selenium
        """
        print("Configurando navegador Chrome...")
        options = Options()
        
        if self.headless:
            options.add_argument('--headless')
        
        # Configurações avançadas para evitar detecção de bot
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument(f'--lang={self.language}')
        options.add_argument('user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36')
        
        # Remove indicadores de automação
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Prefências para parecer mais humano
        prefs = {
            "credentials_enable_service": False,
            "profile.password_manager_enabled": False,
            "intl.accept_languages": self.language,
        }
        options.add_experimental_option("prefs", prefs)
        
        try:
            # Inicializa o driver com gerenciamento automático
            print("Baixando/instalando ChromeDriver...")
            driver_path = ChromeDriverManager().install()
            print(f"Caminho retornado: {driver_path}")
            
            # Corrige o caminho se necessário
            if 'THIRD_PARTY_NOTICES' in driver_path or not driver_path.endswith('chromedriver'):
                # Extrai o diretório base
                base_dir = os.path.dirname(driver_path)
                driver_path = os.path.join(base_dir, 'chromedriver')
                print(f"Caminho corrigido: {driver_path}")
            
            # Verifica se o arquivo existe e é executável
            if not os.path.exists(driver_path):
                raise FileNotFoundError(f"ChromeDriver não encontrado em: {driver_path}")
            
            if not os.access(driver_path, os.X_OK):
                print("Tornando ChromeDriver executável...")
                os.chmod(driver_path, 0o755)
            
            service = Service(driver_path)
            self.driver = webdriver.Chrome(service=service, options=options)
        
            # Maximiza a janela
            self.driver.maximize_window()
            
            # Remove propriedades que indicam automação
            self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                'source': '''
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    })
                '''
            })
            
            print("✓ Navegador iniciado com sucesso!")
            
            return self.driver
            
        except Exception as e:
            print(f"❌ Erro ao iniciar navegador: {str(e)}")
            print("💡 Dica: Certifique-se de que o Google Chrome está instalado")
            raise
    
    def quit(self):
        """Fecha o navegador"""
        if self.driver:
            self.driver.quit()

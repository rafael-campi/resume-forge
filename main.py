"""
main.py
Ponto de entrada principal do bot de automação do LinkedIn.
Coordena a execução das diferentes funcionalidades do bot.
"""

from bot.browser import Browser
from bot.login import login
from bot.search import search_jobs
from bot.apply import apply_to_jobs
import yaml


def load_config():
    """Carrega configurações do arquivo config.yaml"""
    with open('config.yaml', 'r') as file:
        return yaml.safe_load(file)


def main():
    """Função principal que executa o fluxo do bot"""
    print("Iniciando bot de automação do LinkedIn...")
    print("=" * 50)
    
    # Carregar configurações
    config = load_config()
    print("✓ Configurações carregadas")
    
    # Inicializar navegador
    browser = Browser()
    driver = browser.start()
    
    try:
        print("\n[MODO DEBUG] Navegador iniciado com sucesso!")
        print("=" * 50)
        
        # Teste simples: abrir Google
        print("\n[TESTE] Abrindo Google para verificar funcionamento...")
        driver.get('https://www.google.com')
        print(f"✓ Página carregada: {driver.title}")
        
        import time
        time.sleep(2)
        
        # Fazer login no LinkedIn
        print("\n[ETAPA 1] Iniciando login no LinkedIn...")
        print("=" * 50)
        login(driver, config)
        
        # Buscar vagas
        print("\n[ETAPA 2] Buscando vagas...")
        print("=" * 50)
        jobs = search_jobs(driver, config)
        
        # Aplicar para as vagas encontradas
        print("\n[ETAPA 3] Aplicando para vagas...")
        print("=" * 50)
        apply_to_jobs(driver, jobs, config)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Execução interrompida pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro durante execução: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Fechar navegador
        input("\n\nPressione Enter para fechar o navegador...")
        browser.quit()
        print("\n" + "=" * 50)
        print("Bot finalizado.")
        print("=" * 50)


if __name__ == "__main__":
    main()

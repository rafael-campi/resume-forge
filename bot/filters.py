"""
bot/filters.py
Define e aplica filtros nas vagas encontradas.
Filtra por palavras-chave, localização, tipo de trabalho, senioridade, etc.
Evita aplicar para vagas já vistas anteriormente.
"""

import csv
import os


def apply_filters(jobs, config):
    """
    Aplica filtros configurados na lista de vagas
    
    Args:
        jobs (list): Lista de vagas para filtrar
        config (dict): Dicionário com configurações de filtros
        
    Returns:
        list: Lista de vagas que passaram pelos filtros
    """
    print("Aplicando filtros nas vagas...")
    
    filtered_jobs = []
    filters_config = config.get('filters', {})
    
    # Carrega lista de vagas já aplicadas
    applied_jobs = load_applied_jobs()
    
    for job in jobs:
        # Filtro: evita vagas já aplicadas
        if is_already_applied(job, applied_jobs):
            continue
        
        # Filtro: palavras-chave bloqueadas
        blocked_keywords = filters_config.get('blocked_keywords', [])
        if has_blocked_keyword(job, blocked_keywords):
            print(f"✗ Filtrado (palavra bloqueada): {job['title']}")
            continue
        
        # Filtro: palavras-chave obrigatórias
        required_keywords = filters_config.get('required_keywords', [])
        if required_keywords and not has_required_keyword(job, required_keywords):
            print(f"✗ Filtrado (falta palavra obrigatória): {job['title']}")
            continue
        
        # Vaga passou em todos os filtros
        filtered_jobs.append(job)
    
    return filtered_jobs


def load_applied_jobs():
    """
    Carrega lista de vagas já aplicadas do arquivo CSV
    
    Returns:
        list: Lista de tuplas (título, empresa) de vagas já aplicadas
    """
    applied_jobs = []
    csv_file = 'storage/applications.csv'
    
    if os.path.exists(csv_file):
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                applied_jobs = [(row['title'], row['company']) for row in reader]
        except Exception as e:
            print(f"⚠️  Erro ao carregar aplicações anteriores: {str(e)}")
    
    return applied_jobs


def is_already_applied(job, applied_jobs):
    """
    Verifica se já foi aplicado para esta vaga
    
    Args:
        job (dict): Dados da vaga
        applied_jobs (list): Lista de vagas já aplicadas
        
    Returns:
        bool: True se já aplicado, False caso contrário
    """
    job_identifier = (job['title'], job['company'])
    return job_identifier in applied_jobs


def has_blocked_keyword(job, blocked_keywords):
    """
    Verifica se a vaga contém palavras-chave bloqueadas
    
    Args:
        job (dict): Dados da vaga
        blocked_keywords (list): Lista de palavras bloqueadas
        
    Returns:
        bool: True se contém palavra bloqueada, False caso contrário
    """
    job_text = f"{job['title']} {job.get('description', '')}".lower()
    return any(keyword.lower() in job_text for keyword in blocked_keywords)


def has_required_keyword(job, required_keywords):
    """
    Verifica se a vaga contém ao menos uma palavra-chave obrigatória
    
    Args:
        job (dict): Dados da vaga
        required_keywords (list): Lista de palavras obrigatórias
        
    Returns:
        bool: True se contém palavra obrigatória, False caso contrário
    """
    job_text = f"{job['title']} {job.get('description', '')}".lower()
    return any(keyword.lower() in job_text for keyword in required_keywords)

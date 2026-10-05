"""
bot/domain/filters.py
Filtros aplicados às Vagas encontradas: já enviadas (por job id), palavras
bloqueadas e palavras obrigatórias. Funções puras, sem Selenium nem SQL.
"""


def apply_filters(vagas, filters_config, enviadas_ids):
    """
    Devolve as Vagas que passam pelos filtros.

    Args:
        vagas: lista de Vaga
        filters_config: dict com 'blocked_keywords' e 'required_keywords'
        enviadas_ids: set de job ids de Candidaturas já Enviadas
    """
    blocked = filters_config.get('blocked_keywords', [])
    required = filters_config.get('required_keywords', [])

    result = []
    for vaga in vagas:
        if vaga.job_id in enviadas_ids:
            continue
        if has_blocked_keyword(vaga, blocked):
            print(f"✗ Filtrado (palavra bloqueada): {vaga.title}")
            continue
        if required and not has_required_keyword(vaga, required):
            print(f"✗ Filtrado (falta palavra obrigatória): {vaga.title}")
            continue
        result.append(vaga)
    return result


def _contains_any(vaga, keywords):
    text = vaga.searchable_text
    return any(keyword.lower() in text for keyword in keywords)


def has_blocked_keyword(vaga, blocked_keywords):
    """True se o título ou a descrição contém alguma palavra bloqueada."""
    return _contains_any(vaga, blocked_keywords)


def has_required_keyword(vaga, required_keywords):
    """True se o título ou a descrição contém ao menos uma palavra obrigatória."""
    return _contains_any(vaga, required_keywords)

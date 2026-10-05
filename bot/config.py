"""
bot/config.py
Carrega o config.yaml, completa com os padrões e valida. Todas as opções daqui
têm efeito no bot; o Modo de envio padrão é `confirmar`.
"""

import copy

import yaml

from bot.domain.processar import MODOS_DE_ENVIO

PADROES = {
    "search": {"keywords": "", "location": "", "max_pages": 1},
    "filters": {"required_keywords": [], "blocked_keywords": []},
    "apply": {
        "mode": "confirmar",
        "max_applications": 10,
        "delay_between_applications": 3,
        "easy_apply_only": True,
        "resume_path": "",
    },
    "browser": {"headless": False, "timeout": 10, "language": "pt-BR"},
}


class ConfigInvalida(Exception):
    """config.yaml com valor inválido."""


def carregar_config(dados):
    """Mescla `dados` (dict lido do YAML) sobre os padrões e valida o resultado."""
    config = copy.deepcopy(PADROES)
    for secao, valores in (dados or {}).items():
        config.setdefault(secao, {}).update(valores or {})
    _validar(config)
    return config


def ler_config(caminho="config.yaml"):
    with open(caminho, "r", encoding="utf-8") as arquivo:
        return carregar_config(yaml.safe_load(arquivo))


def _validar(config):
    apply, browser = config["apply"], config["browser"]
    if apply["mode"] not in MODOS_DE_ENVIO:
        raise ConfigInvalida(f"apply.mode inválido: {apply['mode']!r} (use confirmar ou auto)")
    if browser["headless"] and apply["mode"] == "confirmar":
        raise ConfigInvalida(
            "browser.headless não combina com apply.mode: confirmar "
            "(não haveria janela para revisar o formulário)"
        )
    if apply["max_applications"] < 1:
        raise ConfigInvalida("apply.max_applications precisa ser maior que 0")
    if browser["timeout"] < 1:
        raise ConfigInvalida("browser.timeout precisa ser maior que 0")

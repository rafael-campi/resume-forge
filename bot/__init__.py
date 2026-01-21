"""
bot/__init__.py
Inicializa o pacote bot e expõe os módulos principais.
Permite importar funcionalidades do bot de forma organizada.
"""

from .browser import Browser
from .login import login
from .search import search_jobs
from .apply import apply_to_jobs
from .filters import apply_filters
from .cookies import save_cookies, load_cookies, delete_cookies

__all__ = ['Browser', 'login', 'search_jobs', 'apply_to_jobs', 'apply_filters', 
           'save_cookies', 'load_cookies', 'delete_cookies']

"""
bot/linkedin/adapter.py
Adaptador LinkedIn: a única camada que clica e digita no Selenium. Implementa a
porta usada por bot/domain/processar.py. Os seletores ficam em selectors.py e a
leitura do HTML em parsing.py; aqui só há navegação e espera.
"""

import random
import time
from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from bot.linkedin import parsing
from bot.linkedin import selectors as sel

MAX_PASSOS = 12
VAGA_URL = "https://www.linkedin.com/jobs/view/{job_id}/"


class FormularioIncompleto(Exception):
    """O formulário pede dados que o bot não tem (Perguntas chegam na fatia seguinte)."""


class LinkedInAdapter:
    def __init__(self, driver, config):
        self.driver = driver
        self.timeout = config["browser"]["timeout"]

    def _esperar(self, seletor):
        return WebDriverWait(self.driver, self.timeout).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, seletor))
        )

    def _clicar(self, seletor):
        self._esperar(seletor).click()
        self._pausa()

    @staticmethod
    def _pausa():
        time.sleep(random.uniform(0.8, 2.0))

    def abrir_formulario(self, vaga):
        self.driver.get(VAGA_URL.format(job_id=vaga.job_id))
        self._pausa()
        if not parsing.tem_easy_apply(self.driver.page_source):
            raise RuntimeError("Vaga sem Candidatura simplificada (Easy Apply)")
        self._clicar(sel.EASY_APPLY_BUTTON)
        WebDriverWait(self.driver, self.timeout).until(
            lambda d: parsing.formulario_aberto(d.page_source)
        )

    def preencher_formulario(self, curriculo):
        """Avança pelos passos até o de revisão, anexando `curriculo` (Path ou None) se pedido; nunca envia."""
        for _ in range(MAX_PASSOS):
            pagina = self.driver.page_source
            passo = parsing.passo_do_formulario(pagina)
            if passo == "enviar":
                return
            if parsing.precisa_de_curriculo(pagina):
                self._anexar_curriculo(curriculo)
                pagina = self.driver.page_source
            vazios = parsing.campos_vazios(pagina)
            if vazios:
                raise FormularioIncompleto(f"campos obrigatórios sem valor: {', '.join(vazios)}")
            if passo == "revisar":
                self._clicar(sel.REVIEW_BUTTON)
            elif passo == "avancar":
                self._clicar(sel.NEXT_BUTTON)
            else:
                raise RuntimeError("Passo desconhecido no formulário Easy Apply")
        raise RuntimeError("Formulário com passos demais; abortado")

    def _anexar_curriculo(self, curriculo):
        if not curriculo:
            raise FormularioIncompleto("o passo pede currículo e não há currículo configurado (apply.resume_path)")
        caminho = Path(curriculo).expanduser().resolve()
        if not caminho.is_file():
            raise FormularioIncompleto(f"currículo não encontrado: {caminho}")
        self.driver.find_element(By.CSS_SELECTOR, sel.RESUME_INPUT).send_keys(str(caminho))
        self._pausa()

    def enviar(self):
        self._clicar(sel.SUBMIT_BUTTON)

    def envio_confirmado(self):
        """True só se o LinkedIn mostrar a confirmação dentro do timeout."""
        try:
            WebDriverWait(self.driver, self.timeout).until(
                lambda d: parsing.envio_confirmado(d.page_source)
            )
        except Exception:
            return False
        try:
            self._clicar(sel.CONFIRMATION_DISMISS)
        except Exception:
            pass
        return True

    def descartar_formulario(self):
        self._clicar(sel.DISMISS_BUTTON)
        self._clicar(sel.DISCARD_BUTTON)

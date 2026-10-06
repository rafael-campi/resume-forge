from pathlib import Path

from bot.linkedin import parsing
from bot.linkedin.gravacao import sanitizar

FIXTURES = Path(__file__).parent / "fixtures"


def html(nome):
    return (FIXTURES / f"{nome}.html").read_text(encoding="utf-8")


def test_lista_le_job_id_titulo_empresa_e_local():
    vagas = parsing.parse_vagas(html("lista_vagas"))

    primeira = vagas[0]
    assert (primeira.job_id, primeira.title) == ("3901234501", "Desenvolvedor Python Pleno")
    assert primeira.company == "Acme Tecnologia"
    assert primeira.location == "Brasil (Remoto)"


def test_lista_acha_job_id_pelo_link_quando_falta_o_atributo():
    ids = [v.job_id for v in parsing.parse_vagas(html("lista_vagas"))]

    assert "3901234503" in ids


def test_lista_ignora_card_sem_job_id_e_nao_duplica():
    ids = [v.job_id for v in parsing.parse_vagas(html("lista_vagas"))]

    assert ids == ["3901234501", "3901234502", "3901234503"]


def test_pagina_da_vaga_detecta_easy_apply_e_le_a_descricao():
    pagina = html("vaga_easy_apply")

    assert parsing.tem_easy_apply(pagina)
    assert "Python e APIs REST" in parsing.parse_descricao(pagina)


def test_pagina_sem_easy_apply():
    assert not parsing.tem_easy_apply(html("vaga_sem_easy_apply"))


def test_passos_do_formulario():
    assert parsing.passo_do_formulario(html("formulario_contato")) == "avancar"
    assert parsing.passo_do_formulario(html("formulario_curriculo")) == "revisar"
    assert parsing.passo_do_formulario(html("formulario_revisao")) == "enviar"
    assert parsing.passo_do_formulario(html("vaga_easy_apply")) is None


def test_formulario_aberto():
    assert parsing.formulario_aberto(html("formulario_contato"))
    assert not parsing.formulario_aberto(html("vaga_easy_apply"))


def test_campos_obrigatorios_vazios_sao_listados_pelo_rotulo():
    assert parsing.campos_vazios(html("formulario_contato")) == ["Celular"]


def test_curriculo_so_e_pedido_quando_nao_ha_um_anexado():
    assert parsing.precisa_de_curriculo(html("formulario_curriculo"))
    assert not parsing.precisa_de_curriculo(html("formulario_curriculo_anexado"))


def test_envio_so_e_confirmado_pela_mensagem_do_linkedin():
    assert parsing.envio_confirmado(html("confirmacao_envio"))
    assert not parsing.envio_confirmado(html("sem_confirmacao"))
    assert not parsing.envio_confirmado(html("formulario_revisao"))


def test_sanitizar_remove_dados_pessoais_e_mantem_a_estrutura():
    sujo = (
        '<html><body><nav class="global-nav">Rafael</nav>'
        '<script>var u="x"</script><img src="https://media/foto.jpg">'
        '<div class="jobs-easy-apply-modal"><input value="maria@exemplo.com">'
        "<p>Fale com maria@exemplo.com ou +55 (11) 99999-8888</p></div></body></html>"
    )

    limpo = sanitizar(sujo)

    assert "maria@exemplo.com" not in limpo
    assert "99999" not in limpo
    assert "Rafael" not in limpo
    assert "<script" not in limpo and "<img" not in limpo
    assert "jobs-easy-apply-modal" in limpo


def test_fixtures_sao_estaveis_sob_sanitizacao():
    for nome in ("lista_vagas", "formulario_revisao", "confirmacao_envio"):
        assert parsing.passo_do_formulario(sanitizar(html(nome))) == parsing.passo_do_formulario(html(nome))

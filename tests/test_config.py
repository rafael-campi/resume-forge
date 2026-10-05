import pytest

from bot.config import ConfigInvalida, carregar_config


def test_modo_de_envio_padrao_e_confirmar():
    assert carregar_config({})["apply"]["mode"] == "confirmar"


def test_valores_do_arquivo_sobrescrevem_os_padroes_sem_perder_os_demais():
    config = carregar_config({"apply": {"mode": "auto"}, "browser": {"timeout": 30}})

    assert config["apply"]["mode"] == "auto"
    assert config["apply"]["max_applications"] == 10
    assert config["browser"]["timeout"] == 30
    assert config["browser"]["headless"] is False


def test_modo_invalido_e_rejeitado():
    with pytest.raises(ConfigInvalida, match="mode"):
        carregar_config({"apply": {"mode": "talvez"}})


def test_headless_com_confirmar_e_rejeitado_porque_ninguem_veria_o_formulario():
    with pytest.raises(ConfigInvalida, match="headless"):
        carregar_config({"browser": {"headless": True}})


def test_headless_com_auto_e_aceito():
    config = carregar_config({"browser": {"headless": True}, "apply": {"mode": "auto"}})

    assert config["browser"]["headless"] is True


def test_limite_e_timeout_precisam_ser_positivos():
    with pytest.raises(ConfigInvalida):
        carregar_config({"apply": {"max_applications": 0}})
    with pytest.raises(ConfigInvalida):
        carregar_config({"browser": {"timeout": -1}})

# Apply Jobs

Bot que automatiza candidaturas Easy Apply no LinkedIn. Vocabulário em `CONTEXT.md`, decisões em `docs/adr/`.

## Configuração

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env          # preencha LINKEDIN_EMAIL e LINKEDIN_PASSWORD
docker compose up -d db       # Postgres local na porta 5433
```

As migrações são aplicadas automaticamente ao iniciar o bot (`python main.py`).

## Testes

```bash
docker compose up -d db
.venv/bin/pytest
```

Os testes usam o banco `apply_jobs_test`, criado automaticamente no mesmo Postgres. Sem o Postgres no ar, os testes de banco são pulados.

## Uso

`python main.py` busca Vagas Easy Apply, filtra e preenche o formulário. No modo `confirmar` (padrão, `apply.mode` no `config.yaml`) o formulário fica aberto no navegador e o terminal pergunta se deve enviar; no modo `auto` o envio é automático. Uma Candidatura só vira Enviada quando o LinkedIn mostra a confirmação. Coloque o currículo no caminho de `apply.resume_path`.

`python gravar.py` faz a Gravação manual de snapshots de DOM (veja `tests/fixtures/README.md`).

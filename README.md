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

# Jobs

Monorepo de busca de emprego: um bot que envia candidaturas no LinkedIn e uma ferramenta que adapta o currículo a cada vaga.

| Pasta | O que é | Stack |
|---|---|---|
| `apply-jobs/` | Bot de Easy Apply no LinkedIn, com registro de cada Candidatura. | Python, Selenium, Postgres |
| `resume-forge/` | Adapta o currículo mestre a cada vaga com IA, sem inventar fatos. | TypeScript |

Cada projeto tem o seu `README.md`, `CONTEXT.md` (vocabulário) e `docs/`. Decisões que valem para os dois ficam em `docs/adr/`.

Atenção: "Vaga" tem sentido diferente em cada `CONTEXT.md` (publicação do LinkedIn com job id, no `apply-jobs`; texto colado, no `resume-forge`).

## Painel de candidaturas

`resume-forge/` tem um painel somente de leitura com o funil de Candidaturas do bot (por Status), busca e o histórico de cada Vaga. Ele lê o mesmo Postgres do bot (ver `docs/adr/0001-monorepo-e-postgres-compartilhado.md`).

```bash
(cd apply-jobs && docker compose up -d db)     # Postgres na porta 5433
cd resume-forge && npm install && npm run dev  # http://127.0.0.1:3000
```

`DATABASE_URL` (opcional) aponta para outro banco; o padrão é o Postgres local acima. O painel só escuta em `127.0.0.1` e não tem autenticação.

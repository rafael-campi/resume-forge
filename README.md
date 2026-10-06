# Jobs

Monorepo de busca de emprego: um bot que envia candidaturas no LinkedIn e uma ferramenta que adapta o currículo a cada vaga.

| Pasta | O que é | Stack |
|---|---|---|
| `apply-jobs/` | Bot de Easy Apply no LinkedIn, com registro de cada Candidatura. | Python, Selenium, Postgres |
| `resume-forge/` | Adapta o currículo mestre a cada vaga com IA, sem inventar fatos. | TypeScript |

Cada projeto tem o seu `README.md`, `CONTEXT.md` (vocabulário) e `docs/`. Decisões que valem para os dois ficam em `docs/adr/`.

Atenção: "Vaga" tem sentido diferente em cada `CONTEXT.md` (publicação do LinkedIn com job id, no `apply-jobs`; texto colado, no `resume-forge`).

# Jobs

Monorepo de busca de emprego: um bot que envia candidaturas no LinkedIn e uma ferramenta que adapta o currículo a cada vaga.

| Pasta | O que é | Stack |
|---|---|---|
| `apply-jobs/` | Bot de Easy Apply no LinkedIn, com registro de cada Candidatura. | Python, Selenium, Postgres |
| `resume-forge/` | Adapta o currículo mestre a cada vaga com IA, sem inventar fatos. | TypeScript |

Cada projeto tem o seu `README.md`, `CONTEXT.md` (vocabulário) e `docs/`. Decisões que valem para os dois ficam em `docs/adr/`.

Atenção: "Vaga" tem sentido diferente em cada `CONTEXT.md` (publicação do LinkedIn com job id, no `apply-jobs`; texto colado, no `resume-forge`).

## App do resume-forge

`resume-forge/` é um app Next.js que usa o mesmo Postgres do bot (ver `docs/adr/0001-monorepo-e-postgres-compartilhado.md`):

- **Currículo mestre** (`/mestre`): formulário por seção com salvamento automático e indicador de completude. As migrações do `resume-forge` (tabelas `forge_*`) rodam sozinhas na primeira requisição.
- **Importar do LinkedIn** (`/mestre/importar`): suba o PDF do perfil (Recursos → Salvar como PDF) e veja uma prévia. A leitura é local, sem IA. Só entram itens novos; nada do que você escreveu é alterado.
- **Vagas** (`/vagas`): cole o texto de uma vaga e a IA extrai os requisitos e escolhe, entre os itens do mestre, o que mostrar (sem escrever nada novo). A análise leva de 1 a 2 minutos e roda em segundo plano; a tela acompanha. Da página de uma candidatura do bot, "Criar currículo adaptado" já preenche título, empresa e descrição.
- **Revisão** (`/vagas/N/revisao`): lista de itens à esquerda e a folha do currículo à direita. Suba, desça, oculte e mostre itens, troque a versão do resumo e veja as lacunas e uma estimativa de páginas (o alvo é 1, o máximo é 2). Os ajustes ficam numa camada à parte: a seleção da IA nunca é alterada, e dá para voltar a uma seleção anterior.
- **Exportar** (`/vagas/N/exportar`): gera o PDF (A4, uma coluna, fonte embutida) imprimindo a folha no Chromium e conta as páginas **do PDF de verdade**; mais de 2 páginas bloqueiam. Guarda o PDF e um instantâneo do texto exportado. O bot lê o PDF mais recente da vaga pelo job id do LinkedIn.
- **Candidaturas** (`/candidaturas`): painel somente de leitura com o funil por Status, busca e o histórico de cada Vaga.

```bash
(cd apply-jobs && docker compose up -d db)     # Postgres na porta 5433
cd resume-forge && npm install && npm run dev  # http://127.0.0.1:3000
```

`DATABASE_URL` (opcional) aponta para outro banco; o padrão é o Postgres local acima. O painel só escuta em `127.0.0.1` e não tem autenticação.

### Configuração da IA (`resume-forge/.env.local`, fora do git)

| Variável | Para quê |
|---|---|
| `NVIDIA_API_KEY` | Chave da NVIDIA Build. Sem ela, a análise de uma vaga termina com um erro que diz o que configurar. |
| `NVIDIA_MODEL` | Modelo (padrão `google/gemma-4-31b-it`). A lista da NVIDIA muda com o tempo. |
| `NVIDIA_TIMEOUT_MS` | Tempo limite por chamada (padrão 240000). |
| `FORGE_IA=falsa` | IA falsa e offline, que só casa palavras. Serve para testar o app sem enviar nada a ninguém. `FORGE_IA_ATRASO_MS` simula a lentidão. |

### PDF: Chromium

A exportação usa o Chromium do Playwright. Instale uma vez com `cd resume-forge && npx playwright install chromium`. Para usar um Chromium que já exista na máquina, defina `CHROMIUM_PATH` com o caminho do executável. Sem Chromium, os testes que imprimem PDF são pulados e a exportação mostra um erro que diz o que fazer.

## O bot com o resume-forge: um currículo por vaga

Por padrão o bot anexa sempre o mesmo PDF (`apply.curriculo: "fixo"` em `apply-jobs/config.yaml`). Para anexar o PDF adaptado a cada vaga:

1. Em `apply-jobs/config.yaml`, ponha `apply.curriculo: "forge"`.
2. Rode o bot (`python main.py`). Vaga sem PDF exportado vira **Revisão manual**, sem abrir o formulário, com uma mensagem dizendo o que fazer.
3. No painel (`/candidaturas`), abra a candidatura e use **Criar currículo adaptado a esta vaga**. Revise e exporte o PDF.
4. Rode o bot de novo: ele acha o PDF mais recente pelo job id do LinkedIn e o anexa.

Como a revisão é sua, o modo `auto` não gera currículo sozinho: vagas sem PDF esperam. O bot só lê as tabelas `forge_*`; quem as escreve é o resume-forge.

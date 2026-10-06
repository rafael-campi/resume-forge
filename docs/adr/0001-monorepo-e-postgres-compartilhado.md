# Monorepo com Postgres compartilhado entre apply-jobs e resume-forge

O `apply-jobs` e o `resume-forge` passam a viver no mesmo repositório, e o `resume-forge` usa o mesmo Postgres do `apply-jobs` em vez de SQLite. O fluxo de uso é um só: o bot encontra a Vaga, o currículo adaptado a ela é gerado e revisado, e o bot o anexa na Candidatura. Dois repositórios com dois bancos obrigavam uma ponte entre processos (subprocesso, códigos de saída, cache em disco e um contrato JSON duplicado nos dois lados) só para responder "existe currículo aprovado para esta Vaga?".

O ponto de integração passa a ser o esquema do banco: uma tabela de currículos adaptados, indexada pelo job id, que o `resume-forge` escreve e o bot lê. A fila de Candidaturas aguardando revisão passa a ser uma consulta (`candidaturas.status = 'revisao_manual'`), e a base de um painel de administração já está no banco (`vagas`, `candidaturas`, `candidatura_historico`).

## Considered Options

- **Dois repositórios com ponte por subprocesso e contrato JSON versionado**: os projetos ficam independentes, mas o contrato e as fixtures se duplicam nos dois lados, e descobrir o que aguarda revisão exige um mecanismo à parte.
- **Reescrever o bot em TypeScript para ter uma única linguagem**: elimina a fronteira entre linguagens, mas refaz um bot que já funciona e tem testes.
- **Monorepo com Postgres compartilhado (escolhida)**: as duas linguagens continuam, mas a costura é uma tabela, não um protocolo entre processos.

## Consequences

- Cada projeto mantém a sua pasta, o seu `CONTEXT.md` e o seu ambiente (`.venv`, `node_modules`). Nenhum caminho mudou.
- **Quem é dono de quê:** as migrações das tabelas do bot continuam em Python (`apply-jobs/bot/repository/migrations/`) e as tabelas dos currículos adaptados ficam sob responsabilidade do `resume-forge`. Cada lado só lê as tabelas do outro; nenhum escreve nelas.
- Muda uma decisão do `resume-forge`: `docs/spec/mvp.md` (seção 5) e o ticket 05 previam SQLite local agora e Postgres depois. A spec ainda não foi atualizada.
- O `resume-forge` passa a exigir o Postgres no ar (`docker compose up -d db`, hoje definido em `apply-jobs/docker-compose.yml`).
- O vocabulário continua separado, e "Vaga" significa coisas diferentes em cada `CONTEXT.md`. Ao ligar os dois, o texto da Vaga do `resume-forge` é a descrição da Vaga do `apply-jobs`.
- Um painel de administração fica para depois. Se ele for acessado fora da máquina local (o motivo do ADR do Postgres do `apply-jobs`), vai exigir autenticação, que a spec do `resume-forge` deixou fora de escopo.
- Os repositórios originais no GitHub (`rafael-campi/apply-jobs` e `rafael-campi/resume-forge`) não foram alterados. O repositório raiz ainda não tem remoto, e o rastreador de Issues do `apply-jobs` depende do remoto, então a decisão sobre onde passam a viver é do dono.

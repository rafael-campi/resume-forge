---
label: wayfinder:map
title: Resume Forge — adaptar currículo à vaga com IA
---

## Destination

Uma **especificação de MVP** pronta para entregar a um agente construir: app web local, de uso pessoal (só o Rafael), que recebe o texto de uma vaga, usa IA (NVIDIA Build) para selecionar e ordenar itens do currículo mestre, permite revisão e exporta um PDF ATS-friendly. A construção em si fica fora do mapa.

## Notes

- Vocabulário em [CONTEXT.md](../../../CONTEXT.md): currículo mestre, vaga, currículo adaptado, lacuna, revisão.
- Idioma: tudo em português. A IA nunca traduz.
- Regra de honestidade: a IA só **seleciona, ordena e oculta** itens do mestre por ID. O texto sai exatamente como escrito no mestre. Se faltar poder de adaptação, evoluir depois para troca de palavras, sempre com revisão.
- Lacunas da vaga viram avisos na revisão, nunca texto inventado.
- Saída só em PDF, um template de uma coluna ATS-friendly. Alvo de 1 página (máximo 2); estouro vira aviso na revisão.
- Stack preferida: TypeScript. Dados em Postgres, o mesmo do `apply-jobs` (histórico por vaga incluído; ver ADR 0001 na raiz do monorepo, que substituiu a decisão inicial de SQLite local). Hospedagem em si é fora de escopo.
- Privacidade: nome e contato nunca vão para a IA. A integração com a IA fica atrás de uma interface trocável.
- A especificação final deve incluir um teste de fumaça da NVIDIA Build (`guided_json`, português, limite de taxa).
- Fluxo de preenchimento do mestre: formulário no próprio app.
- Cada ticket HITL é resolvido em conversa com o Rafael, em português.
- Convenção do tracker local: tickets em `tickets/NN-slug.md` com frontmatter (`label`, `status`, `assignee`, `blocked-by`). Pesquisas ficam em `research/`.

## Decisions so far

<!-- uma linha por ticket fechado -->

- [Histórico de adaptações por vaga](tickets/09-adaptation-history.md): vaga com várias gerações, ajustes manuais numa camada à parte, instantâneo do texto por geração, PDF exportado guardado, lista com busca e exclusão definitiva.
- [Template do PDF: seções, tipografia e margens](tickets/08-pdf-template.md): A4 de uma coluna, sans-serif, Skills logo após o Resumo, fonte fixa e até 2 páginas, datas alinhadas por CSS com teste de extração de texto como critério ATS.
- [Tela de revisão: diff, lacunas e aviso de página](tickets/06-review-screen.md): layout "lista e folha" (itens recolhíveis à esquerda, folha do PDF fixa à direita), faixa fixa com lacunas e páginas, adicionar item na revisão salvando no mestre, etapas Mestre → Vaga → Revisão → Exportar.
- [Stack e arquitetura: TypeScript, framework e persistência](tickets/05-stack-and-architecture.md): Next.js, PDF via Chromium headless com o mesmo HTML do preview, Drizzle com Postgres compartilhado com o `apply-jobs` (a decisão original era SQLite; ver ADR 0001 na raiz), chave em variável de ambiente, três módulos independentes.
- [Contrato de seleção: o que a IA recebe e devolve](tickets/04-selection-contract.md): duas chamadas (requisitos da vaga, depois seleção por ID ordenada com cobertura e lacunas); validação e correção em código; tamanho decidido na revisão; temperatura baixa com regenerar.
- [Provedor de IA e privacidade dos dados](tickets/07-ai-provider-and-privacy.md): NVIDIA Build como avaliação pessoal local, sem nome nem contato na entrada, atrás de interface trocável; hospedagem só como restrição; teste de fumaça cobre os pontos não confirmados.
- [Schema do currículo mestre e formulário de preenchimento](tickets/03-master-resume-schema.md): a IA seleciona bullets e oculta experiências, skills são itens, resumo tem várias versões escritas por você, tags opcionais, formulário por seção com autosave, parte do zero.
- [NVIDIA Build (NIM): API, modelos, saída estruturada e limites](tickets/01-nvidia-build-api.md): API compatível com OpenAI, `guided_json` a confirmar com chamada real; o tier de teste proíbe dados pessoais e produção, o que gerou o ticket de provedor e privacidade.
- [Geração de PDF ATS-friendly em TypeScript e medição de páginas](tickets/02-pdf-generation.md): três opções (Chromium headless, react-pdf, pdf-lib); medir páginas contando as do PDF gerado; escolha final fica para a stack.

## Not yet specified

<!-- vazio: não resta fog a graduar -->

## Out of scope

- Extração de vaga por URL/scraping: o MVP cola o texto.
- Saída em DOCX: só PDF.
- Multiusuário, contas e autenticação: uso pessoal.
- Hospedagem e deploy: só a restrição de design de não bloquear a migração futura.
- Tradução e reescrita livre de texto pela IA.
- Qualidade da seleção (avaliação com vagas reais) e prompt das duas chamadas: dependem do teste de fumaça da API, que só acontece na construção. A especificação final pede o teste, mas a afinação é trabalho de execução.
- Importação do currículo existente (PDF ou LinkedIn): o MVP parte do zero pelo formulário. Melhoria futura.

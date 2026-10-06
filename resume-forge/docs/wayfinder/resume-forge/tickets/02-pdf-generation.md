---
label: wayfinder:research
title: Geração de PDF ATS-friendly em TypeScript e medição de páginas
status: closed
assignee:
blocked-by: []
---

## Question

Quais são as opções para gerar em TypeScript um PDF de uma coluna, com texto selecionável e boa leitura por sistemas ATS?

- Opções (por exemplo, renderização HTML→PDF com navegador headless, react-pdf, pdf-lib) com prós e contras.
- Como medir se o conteúdo cabe em 1 página antes de exportar.
- Funciona igual local e hospedado?
- Boas práticas de ATS para seções, fontes e ordem de leitura.

## Pointer

Achados em `../research/02-pdf-generation.md`.

## Resolution

Três caminhos viáveis em TypeScript:
- **Chromium headless (Puppeteer/Playwright):** layout em CSS e texto selecionável, mas depende de um Chromium na hospedagem.
- **@react-pdf/renderer:** roda em Node sem navegador. Aceita só fontes TTF/WOFF, e o estilo não é CSS web, então o preview não é idêntico.
- **pdf-lib:** de baixo nível, melhor para pós-processar do que para compor o currículo.

Para medir 1 página, a recomendação é gerar o PDF e contar as páginas do resultado (inferência do agente, não afirmada em doc). Não há doc oficial sobre ATS além dos formatos aceitos pelo Greenhouse; as boas práticas (uma coluna, sem tabelas, texto real, checar a extração de texto) são inferência.

Ficaram **não verificados**: `wrap`/`totalPages` do react-pdf, `getPageCount` do pdf-lib e os requisitos de Chromium em provedores de hospedagem. A escolha entre as opções é decisão a tomar no ticket de stack e arquitetura.

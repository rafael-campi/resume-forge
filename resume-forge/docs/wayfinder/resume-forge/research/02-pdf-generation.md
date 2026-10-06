# Pesquisa 02: geração de PDF ATS-friendly em TypeScript e medição de páginas

Ticket: `../tickets/02-pdf-generation.md`. Data: 2026-10-05. Apenas fontes primárias (docs oficiais). Itens marcados **[inferência]** são conclusões minhas, não afirmadas pela fonte. Itens marcados **[não verificado]** não foram confirmados em fonte primária.

## Resumo

- Para um currículo de uma coluna, as três opções produzem texto selecionável. A escolha pesa mais em controle de layout e em medir páginas.
- **HTML→PDF com Chromium headless (Puppeteer ou Playwright)** dá o layout mais fácil (CSS) e o PDF sai como texto. Exige um navegador no servidor, o que pesa na hospedagem.
- **@react-pdf/renderer** é JS puro em Node, com quebra de página automática e fontes TTF/WOFF. Não depende de navegador.
- **pdf-lib** é de baixo nível: não quebra linha sozinho (é preciso medir e quebrar à mão). Serve melhor para pós-processar (contar páginas, juntar) do que para compor o currículo.
- **Medir 1 página**: gerar o PDF e contar as páginas do resultado. É a forma mais confiável e funciona igual com qualquer motor **[inferência]**.

## Opções

### 1. Puppeteer / Playwright (HTML→PDF com Chromium headless)

Fatos:
- `page.pdf()` gera o PDF com a mídia CSS `print` e retorna `Promise<Uint8Array>`. Cores são ajustadas para impressão por padrão; `-webkit-print-color-adjust` força as cores exatas. [Puppeteer Page.pdf](https://pptr.dev/api/puppeteer.page.pdf)
- Opções em `PDFOptions`: `tagged` (padrão `true`, gera PDF acessível/marcado), `outline` (experimental, padrão `false`), `preferCSSPageSize` (padrão `false`; se `true`, `@page size` vale mais que `format`/width/height), `format` (padrão `letter`; tem prioridade sobre width/height), `margin`, `waitForFonts` (padrão `true`, espera `document.fonts.ready`), `timeout` (padrão 30000 ms). [Puppeteer PDFOptions](https://pptr.dev/api/puppeteer.pdfoptions)
- No Playwright, `page.pdf()` só funciona em Chromium headless; templates de cabeçalho/rodapé não executam scripts nem enxergam os estilos da página. Tem `tagged`, `outline`, `preferCSSPageSize`, `margin`, `format`. [Playwright Page.pdf](https://playwright.dev/docs/api/class-page#page-pdf)
- CSS `@page { size: A4; }` aceita A4, letter etc. e valores em comprimento. [MDN @page size](https://developer.mozilla.org/en-US/docs/Web/CSS/@page/size)

Prós: layout em HTML/CSS, fácil de manter e de reaproveitar na tela de revisão (mesmo HTML para preview e PDF) **[inferência]**; PDF tagged por padrão no Puppeteer.
Contras: precisa de binário do Chromium e de ambiente que o rode (peso e configuração na hospedagem) **[inferência]**; Playwright limita a Chromium headless.

### 2. @react-pdf/renderer

Fatos:
- Fontes: só TTF e WOFF; fontes variáveis OpenType não funcionam. Traz 12 fontes padrão (Courier, Helvetica, Times-Roman e variantes). Registro via `Font.register()`. Hifenização controlável com `hyphenationPenalty` (`Infinity` desliga) e `registerHyphenationCallback`. [react-pdf Fonts](https://react-pdf.org/fonts)
- APIs de Node: `renderToFile`, `renderToString`, `renderToBuffer`, `renderToStream`. [react-pdf Node](https://react-pdf.org/node)
- A navegação da doc lista quebra de página (page wrapping), conteúdo dinâmico (render props com `pageNumber`/`totalPages`) e proteção de órfãs/viúvas; as páginas de detalhe não foram recuperadas pela ferramenta, então o comportamento exato do `wrap` e do `totalPages` **[não verificado]**. [react-pdf Advanced](https://react-pdf.org/advanced)

Prós: sem navegador; roda em Node. Contras: não usa CSS web (subconjunto próprio, estilo React Native), então o preview na tela não é o mesmo layout do PDF **[inferência]**.

### 3. pdf-lib

Fatos:
- JS puro, sem dependências nativas; roda em navegador, Node, Deno e React Native. Embute fontes customizadas via `@pdf-lib/fontkit`; fontes padrão disponíveis. Oferece `widthOfTextAtSize()` e `heightAtSize()` para medir. [pdf-lib](https://pdf-lib.js.org/)
- `PDFPage.drawText` não tem quebra automática por largura máxima; há `lineHeight` para textos com `\n`. É preciso quebrar linhas manualmente. [pdf-lib PDFPage](https://pdf-lib.js.org/docs/api/classes/pdfpage)

Prós: leve, ambiente-agnóstico, controle total. Contras: você implementa o layout (quebra de linha, marcadores, espaçamento) **[inferência: trabalho considerável]**.

## Como medir se cabe em 1 página

1. **Contar páginas do PDF gerado** (recomendado). Gerar o PDF no motor escolhido e ler o número de páginas (por exemplo com pdf-lib, que permite carregar um PDF e gerenciar páginas, conforme sua doc) **[inferência: o método `getPageCount` não foi confirmado nesta pesquisa]**. Se passar de 1, a UI avisa ou aplica redução (fonte/margens/corte de itens).
2. **Medição no DOM (Chromium)**: comparar a altura do conteúdo com a altura útil da página (tamanho e margens definidos em `@page`/`PDFOptions`) **[inferência; sem fonte primária que garanta equivalência exata com a paginação da impressão]**.
3. **react-pdf**: o render prop de conteúdo dinâmico expõe `totalPages` (citado na doc de navegação; detalhes **[não verificado]**), mas a contagem sobre o PDF final dispensa depender disso.
4. Com fontes web, esperar o carregamento antes de medir: no Puppeteer `waitForFonts` já é `true` por padrão. [Puppeteer PDFOptions](https://pptr.dev/api/puppeteer.pdfoptions)

## Local versus hospedado

- Puppeteer/Playwright: o motor é o mesmo, mas o resultado depende das fontes instaladas no sistema e do Chromium disponível; para consistência, embutir fontes explícitas (webfonts/arquivos) e esperar `document.fonts.ready` **[inferência]**. Hospedagem sem Chromium (ambientes serverless restritos) é o principal risco **[inferência; não verificado em doc de provedor]**.
- react-pdf e pdf-lib: JS puro, mesmas fontes registradas em qualquer ambiente, então tendem a ser idênticos local e hospedado **[inferência]**. As fontes padrão do PDF (Helvetica etc.) não dependem do sistema; fontes customizadas são embutidas pelo registro. [react-pdf Fonts](https://react-pdf.org/fonts), [pdf-lib](https://pdf-lib.js.org/)

## Boas práticas de ATS

Fontes primárias sobre parsing de ATS são escassas. O que se confirmou em fonte do próprio fornecedor:
- Greenhouse aceita .doc, .docx, .pdf, .rtf e .txt (até 100 MB); imagens vinculadas externamente não são carregadas na conversão para preview, imagens embutidas sim. [Greenhouse: formatos suportados](https://support.greenhouse.io/hc/en-us/articles/360052218132-Supported-formats-for-resumes-cover-letters-and-other-candidate-uploads)

Não encontrei documentação oficial de Greenhouse/Lever/Workday sobre colunas, tabelas, fontes ou ordem de leitura. Afirmações como "Workday falha com tabelas e colunas" aparecem apenas em blogs de terceiros (descartados pelo critério de fontes primárias). Recomendações abaixo são **[inferência]** e consistentes com o escopo (uma coluna):
- Uma coluna, sem tabelas, sem texto em imagem; ordem de leitura = ordem do documento (cabeçalho, resumo, experiência, formação, habilidades).
- Títulos de seção convencionais; fontes padrão ou embutidas; texto real (não rasterizado).
- Verificar o resultado extraindo o texto do PDF e conferindo a ordem **[sugestão de teste]**.
- Puppeteer/Playwright geram PDF tagged (`tagged`), o que ajuda estrutura/acessibilidade; efeito sobre ATS específicos **[não verificado]**.

## Lacunas

- Detalhes de `wrap`/`totalPages` do react-pdf e API de contagem de páginas do pdf-lib não foram recuperados.
- Sem fonte oficial de ATS sobre layout; validar com extração de texto do próprio PDF.
- Requisitos de hospedagem para Chromium não verificados.

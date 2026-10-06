# Resume Forge: especificação do MVP

Destino do mapa em `docs/wayfinder/resume-forge/map.md`. Cada decisão abaixo aponta para o ticket que a detalha e justifica. Vocabulário em `CONTEXT.md`.

## 1. Objetivo

Ferramenta **pessoal e local** (só o Rafael) que adapta o currículo a cada vaga com IA. O Rafael cola o texto da **vaga**, a IA seleciona e ordena itens do **currículo mestre**, ele revisa e exporta um PDF ATS-friendly.

**Regra de honestidade:** a IA só seleciona, ordena e oculta itens do mestre, por ID. O texto sai exatamente como está no mestre. Nunca escreve, reescreve nem traduz. Requisitos da vaga sem cobertura viram **lacunas** (aviso), nunca texto inventado.

Idioma: tudo em português.

## 2. Fluxo

Cabeçalho fixo com etapas clicáveis: **Mestre → Vaga → Revisão → Exportar**.

1. **Mestre:** formulário por seção, com salvamento automático e indicador de completude. Parte do zero.
2. **Vaga:** colar o texto e analisar.
3. **Revisão:** ver e ajustar a seleção da IA (seção 6).
4. **Exportar:** resumo de páginas, lacunas e itens ocultos, e download do PDF.

Protótipo de referência (descartável, só para a tela de revisão e o fluxo): `docs/wayfinder/resume-forge/prototypes/review-screen/index.html`.

## 3. Currículo mestre

Ticket: *Schema do currículo mestre e formulário de preenchimento*.

- **Seções:** dados pessoais e contato, resumo, experiências, projetos, formação, skills, certificações, idiomas.
- **Item:** unidade que a IA seleciona, ordena ou oculta: bullet, experiência, projeto, skill, certificação ou versão de resumo. Todo item tem **ID estável** gerado automaticamente.
- **Experiência:** empresa, cargo e datas são fixos. A IA seleciona e ordena os **bullets** e pode ocultar a experiência inteira. O Rafael escreve vários bullets por experiência.
- **Skills:** cada skill é um item, com categoria opcional.
- **Resumo:** várias versões escritas pelo Rafael. A IA escolhe uma.
- **Tags:** opcionais, por item (experiência, bullet, projeto). Não aparecem no PDF e servem só para o casamento com a vaga.
- **Sempre visível:** contato, formação e idiomas são sempre visíveis. Qualquer item pode receber a flag "sempre visível". A IA não decide sobre eles.
- **Defaults assumidos (sem pergunta explícita, revisar se necessário):** datas em mês/ano com "atual"; contato com e-mail, telefone, cidade e links opcionais (LinkedIn, GitHub, site); projetos e certificações são itens selecionáveis.

## 4. Seleção com IA

Tickets: *Contrato de seleção: o que a IA recebe e devolve*, *Provedor de IA e privacidade dos dados*, *NVIDIA Build (NIM): API, modelos, saída estruturada e limites*.

### 4.1 Duas chamadas

1. **Extrair requisitos** da vaga, em lista estruturada. Os requisitos aparecem na revisão e alimentam as lacunas.
2. **Selecionar:** casar os requisitos com os itens.

Saída da seleção, validada por schema:

- `resumo`: ID da versão escolhida;
- por seção, lista **ordenada** de IDs dos itens a mostrar (quem não está na lista fica oculto);
- por item mostrado, os requisitos da vaga que ele cobre;
- `lacunas`: requisitos sem cobertura.

Sem score numérico nem justificativa em texto livre: a ordem expressa a relevância e a cobertura é a justificativa.

### 4.2 Entrada, tamanho e variação

- A IA recebe o texto completo de todos os itens (sem pré-filtro no MVP) e **nunca** nome, e-mail, telefone, cidade nem links. Empresas e projetos ficam no texto. Itens "sempre visível" ficam fora da decisão: o app os insere nas posições fixas.
- A IA não recebe orçamento de itens. O app mede o PDF e avisa o estouro na revisão, e o Rafael decide o corte.
- Temperatura baixa e botão **Regenerar**.

### 4.3 Validação e erro

O código valida schema, IDs existentes, duplicatas, seção correta e itens "sempre visível".

- Corrige sozinho o que não é ambíguo: IDs inexistentes, duplicatas, itens "sempre visível" ausentes.
- Schema quebrado: até 2 novas tentativas, devolvendo o erro ao modelo.
- Se ainda falhar: erro claro e nenhum PDF parcial.

### 4.4 Provedor

- **NVIDIA Build** (API compatível com OpenAI, `POST https://integrate.api.nvidia.com/v1/chat/completions`, listagem em `GET /v1/models`). Modelo inicial: **`google/gemma-4-31b-it`**, com saída estruturada via **`response_format: json_schema`** (ver 4.5). O `meta/llama-3.3-70b-instruct` apontado pela pesquisa foi **desativado em 26/08/2026** (HTTP 410), e o `nvext.guided_json` é rejeitado pelo endpoint hospedado. O modelo vem de configuração, e a lista muda com o tempo.
- A chamada fica atrás de uma **interface trocável** (entrada e saída fixas, NVIDIA como primeira implementação).
- **Termos de uso:** o tier de teste é só para avaliação, proíbe dados pessoais de pessoa identificável e produção, e a NVIDIA pode mudar ou cortar o serviço. O MVP é tratado como **avaliação pessoal e local**, com risco residual aceito pelo Rafael (o conteúdo dos itens ainda pode identificá-lo).
- **Se a chamada real falhar nos testes:** tool calling ou validação com retry, depois outro modelo na NVIDIA, depois outro provedor.
- **Hospedagem futura** é só restrição de design: hospedar é produção e exigiria assinatura, NIM auto-hospedado ou outro provedor.

### 4.5 Teste de fumaça

Script: `scripts/smoke-nvidia.mjs` (`--selftest` testa só o validador, sem rede; `NVIDIA_MODEL`, `NVIDIA_MODOS` e `NVIDIA_CENARIO=lacunas` escolhem modelo, modos e cenário). Usa só dados inventados, sem nome nem contato. A chave fica em `.env` ou `.env.local`, ambos no `.gitignore`.

**Executado em 05/10/2026**, nos três modos de saída estruturada. Resultados:

| Ponto | Resultado |
|---|---|
| Autenticação | `Authorization: Bearer <chave>` funciona. |
| `nvext.guided_json` | **Rejeitado** (HTTP 400, campo desconhecido) em `nemotron-3-super` e `gemma-4`. Descartado. |
| `response_format: json_schema` | **Funciona** em `gemma-4-31b-it` e `gpt-oss-20b` (seleção válida nos dois). No `nemotron-3-super` a extração passou, mas a seleção veio com lixo (`"/..."` no lugar de IDs). |
| Só prompt (sem schema) | Funcionou no `gemma-4`, **falhou no `gpt-oss-20b`** (devolveu texto no lugar de IDs). Só o schema garante os IDs, então o prompt sozinho não basta. |
| Extrair requisitos | Correto em todos os modelos que responderam: os 6 requisitos da vaga de exemplo, sem inventar. |
| Selecionar | `gemma-4` devolveu uma seleção válida nos dois modos, idêntica entre eles, com ordem plausível. |
| Latência | Alta e variável: de 2 s a mais de 40 s por chamada, de 38 s a 105 s por geração completa no `gemma-4`. Houve uma resposta 529 "Service temporarily overloaded". Mostrar progresso na interface. O teste ao vivo do módulo em TypeScript (`NVIDIA_VIVO=1`) passou, mas levou **236 s** no total: o tempo limite padrão de 180 s por chamada é apertado e deve ser configurável. |
| Limite de taxa | Nenhum cabeçalho de limite foi exposto e nenhum 429 apareceu. **O limite real continua desconhecido.** |
| Lacunas | **Funciona** no `gemma-4` (`NVIDIA_CENARIO=lacunas`, vaga que pede Kubernetes, Go e Terraform, ausentes do mestre): devolveu exatamente essas três como `lacunas`, sem inventar cobertura, e o validador aprovou. Levou 79 s no total. O bullet de ECS foi mantido sem marcar cobertura de Kubernetes, o que é honesto. A ordem das experiências (Beta antes de Alfa) é discutível, e quem julga é o Rafael. |
| Modelos | `llama-3.3-70b` desativado (410). `mistral-large-2` e `nemotron-nano-3` aparecem na listagem mas dão 404 para esta conta. `deepseek-v4.1-flash` devolveu conteúdo vazio com `json_schema`. `deepseek-v4.1-flash` e `glm-5.3-flash` estouraram o tempo. |
| Modelos de raciocínio | Podem gastar todos os `max_tokens` pensando e devolver conteúdo vazio (`finish_reason=length`). Tratar conteúdo vazio como erro e preferir modelo sem raciocínio longo. |

**O que o teste não cobre:**
- **Qualidade da escolha.** O validador confere IDs, duplicatas e coerência das lacunas, não se a seleção é boa. Quem julga é o Rafael, lendo a seleção.
- **Vagas e mestre reais.** Só dados inventados foram usados.
- **Custo.** Créditos e preço por token continuam sem informação oficial.

**Consequências para a construção:**
- Usar `response_format: json_schema` e validar a saída em código (4.3) sempre.
- O schema de `cobertura` como mapa de IDs funcionou no `gemma-4`. Se um modelo falhar, trocar por uma lista de pares `{item, requisitos}`.
- A interface trocável (4.4) é indispensável: modelos somem e mudam.

Não verificado: valor dos créditos, limite de taxa oficial e preço por token.

## 5. Stack e arquitetura

Ticket: *Stack e arquitetura: TypeScript, framework e persistência*.

- **Next.js** (App Router), TypeScript, um projeto e um processo. As rotas de servidor guardam a chave da IA e orquestram os módulos.
- **Dados:** Drizzle ORM com **SQLite** local agora (Postgres depois, trocando driver e dialeto), com uma interface de repositório por cima.
- **Chave da IA:** variável de ambiente só no servidor, em `.env.local` fora do git.
- **Execução:** um comando e um arquivo SQLite local. Docker só na hospedagem futura.
- **Módulos independentes, sem dependência entre si:**
  - **seleção:** `extrairRequisitos(vaga)` e `selecionar(requisitos, itens)`, com o cliente da IA atrás de interface. Validação e correção da saída em funções puras;
  - **PDF:** `renderizar(curriculoAdaptado) → bytes`;
  - **persistência:** repositórios do mestre e do histórico.
  
  Uma camada fina de rotas orquestra os três.

## 6. Tela de revisão

Ticket: *Tela de revisão: diff, lacunas e aviso de página*. Layout escolhido: **A, "Lista e folha"**.

- Itens à esquerda, em **seções recolhíveis** com contagem ("3 de 5 visíveis"). Experiência e resumo abertos por padrão. Folha do PDF **fixa à direita**, com a marca de fim da página 1.
- **Faixa fixa no topo:** vaga, requisitos cobertos de N, lacunas, barra de página (marca de 1 página) e a ação principal "Continuar para exportar". "Regenerar" ao lado.
- **Lacunas:** painel no topo da lista, com o requisito destacado e atalho "+ bullet" por lacuna.
- **Controles por item** (subir, descer, ocultar/mostrar): aparecem ao passar o mouse ou focar e sempre no toque. O resumo troca de versão ("usar este").
- **Adicionar item na revisão:** bullet numa experiência, projeto ou skill, com tags opcionais. É salvo no mestre e entra visível, marcado "novo · a IA ainda não viu" até a próxima geração. Experiências novas e versões de resumo só se criam no formulário do mestre.
- **Exportar:** lacunas não bloqueiam. Mais de 2 páginas bloqueiam.
- Descartados: layout B (por requisito) e C (documento único). A ideia do B de abrir o detalhe de cada lacuna pode voltar como evolução.

## 7. PDF

Tickets: *Geração de PDF ATS-friendly em TypeScript e medição de páginas*, *Template do PDF: seções, tipografia e margens*.

- **Geração:** Chromium headless (Puppeteer ou Playwright) renderizando o **mesmo HTML** do preview da revisão, com **fontes embutidas** no projeto. Custo conhecido: depender de um Chromium na hospedagem futura.
- **Medir páginas:** contar as páginas do PDF gerado.
- **Template:** A4, uma coluna, margens de 1,8 cm. Uma família sans-serif, corpo de 10 a 10,5 pt, peso 600 em títulos de seção e cargos, sem itálico fora de datas.
- **Ordem fixa das seções:** cabeçalho → Resumo → Skills → Experiência → Projetos → Formação → Idiomas. A IA só ordena itens dentro de cada seção.
- **Cabeçalho:** nome em destaque e uma linha com cidade · e-mail · telefone · LinkedIn · GitHub, em texto visível e também clicável.
- **Experiência:** "empresa · cargo" à esquerda e datas à direita, alinhadas por CSS (sem tabela). Se a extração de texto embaralhar a ordem, cai para as datas na mesma linha, depois do cargo.
- **Skills:** uma linha por categoria, na ordem escolhida. Sem categoria vão numa linha "Outras" no fim.
- **Estouro:** fonte e espaçamento fixos, nunca espremidos. Até 2 páginas. Quem resolve o excesso é o Rafael, ocultando itens.
- **ATS:** não há doc oficial sobre colunas, tabelas ou ordem de leitura. As regras (uma coluna, sem tabelas, texto real) são inferência, verificadas pelo teste de extração de texto do PDF.
- **Atenção:** o protótipo usa folha serifada e Skills no fim. A folha real segue esta seção, não o protótipo.

Não verificado na pesquisa: `wrap` e `totalPages` do react-pdf, `getPageCount` do pdf-lib e requisitos de Chromium em provedores de hospedagem (só importa na hospedagem).

## 8. Histórico

Ticket: *Histórico de adaptações por vaga*.

- Uma **vaga** com várias **gerações**. A vaga guarda título, empresa, texto original e os requisitos extraídos. Cada geração guarda a seleção da IA (IDs, ordem, cobertura), as lacunas e o modelo usado.
- **Ajustes manuais** numa camada à parte, por cima da seleção da IA, que fica intacta. O resultado final é a seleção mais os ajustes. Regenerar não apaga os ajustes sem aviso.
- Cada geração guarda um **instantâneo do texto** dos itens mostrados, com o ID para ligar ao item original quando ele ainda existir.
- O **PDF exportado** e a data de exportação são guardados.
- **Reabrir:** lista por data, mais recente primeiro, com título, empresa e estado (rascunho ou exportado), com busca por título e empresa. Reabrir leva à última geração na revisão. Um seletor mostra as anteriores, e voltar a uma antiga a torna a atual. Sem comparação lado a lado.
- **Exclusão:** definitiva, por vaga, com confirmação. Sem lixeira nem retenção automática.

## 9. Estratégia de testes

- Unitários na validação e correção da saída da IA (cliente de IA falso).
- PDF com currículo fixo: contar páginas e extrair o texto para checar conteúdo e ordem de leitura (inclusive "empresa, cargo, datas").
- Teste de fumaça manual da NVIDIA Build (seção 4.5).
- Sem testes de ponta a ponta no MVP.

## 10. Fora de escopo

- Extração de vaga por URL/scraping (o MVP cola o texto).
- DOCX (só PDF).
- Multiusuário, contas e autenticação.
- Hospedagem e deploy (só a restrição de design).
- Tradução e reescrita livre pela IA.
- Afinação de qualidade da seleção e do prompt (depende do teste de fumaça, é trabalho de construção).
- Importação do currículo existente (PDF ou LinkedIn).

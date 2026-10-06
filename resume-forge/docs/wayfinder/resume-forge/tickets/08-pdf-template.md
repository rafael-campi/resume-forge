---
label: wayfinder:grilling
title: Template do PDF: seções, tipografia e margens
status: closed
assignee: rafael
blocked-by: []
---

## Question

Como é o layout de uma coluna do PDF? Ordem das seções (resumo, experiência, projetos, skills, formação, idiomas), cabeçalho com contato, tipografia e fontes embutidas, tamanhos, margens e espaçamento. A folha do protótipo da tela de revisão é o ponto de partida. O que sai quando a seleção não cabe em 1 página (tamanho de fonte fixo ou ajustado)? Como o texto ATS-friendly (uma coluna, sem tabelas, texto real) é garantido e verificado?

## Resolution

Decidido com o Rafael (todas as recomendações aceitas):

- **Ordem das seções, fixa:** cabeçalho (nome e contato) → Resumo → Skills → Experiência → Projetos → Formação → Idiomas. Skills logo depois do Resumo para a triagem automática ver as palavras-chave cedo. A IA não muda a ordem das seções, só dos itens dentro de cada uma.
- **Cabeçalho:** nome em destaque e uma linha de contato com texto visível: cidade · e-mail · telefone · LinkedIn · GitHub. Links escritos por extenso e também clicáveis.
- **Tipografia:** uma família sans-serif só, com fontes embutidas no projeto. Corpo de 10 a 10,5 pt. Peso 600 em títulos de seção e cargos. Sem itálico fora de datas.
- **Página:** A4, margens de 1,8 cm. Letter fica fora do MVP.
- **Estouro:** o tamanho de fonte e o espaçamento são sempre fixos, nunca espremidos para caber. O PDF ocupa até 2 páginas. Quem resolve o excesso é o Rafael, ocultando itens na revisão.
- **Experiência:** uma linha com "empresa · cargo" à esquerda e datas à direita, alinhadas por CSS (sem tabela). Condição: a extração de texto do PDF deve devolver empresa, cargo e datas nessa ordem. Se embaralhar, cai para datas na mesma linha, depois do cargo, sem alinhar à direita.
- **Skills:** uma linha por categoria ("Linguagens: TypeScript, Python"), na ordem em que foram escolhidas. Skills sem categoria vão numa linha "Outras" no fim.
- **Verificação de ATS:** teste de extração de texto do PDF (conteúdo e ordem de leitura), já previsto na stack. Sem parser externo, porque enviaria o currículo a terceiros e contraria a regra de privacidade.

Divergência a lembrar: o protótipo da tela de revisão usa a folha em serifada e Skills no fim. A folha real segue esta decisão.

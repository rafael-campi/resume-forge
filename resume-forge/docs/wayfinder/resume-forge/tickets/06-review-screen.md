---
label: wayfinder:prototype
title: Tela de revisão: diff, lacunas e aviso de página
status: closed
assignee: rafael
blocked-by: [04-selection-contract, 02-pdf-generation]
---

## Question

Como deve ser a tela única de revisão? Ela mostra mestre vs. adaptado (itens selecionados, ocultos, reordenados), as lacunas da vaga, o aviso de estouro de página e o botão de exportar PDF. Como o Rafael ajusta (reativar item oculto, reordenar) antes de exportar? Prototipar para reagir a algo concreto.

## Pointer

Protótipo (descartável, HTML único, dados inventados): [prototypes/review-screen/index.html](../prototypes/review-screen/index.html). Abrir com `?variant=A|B|C`. O repositório não tem commits, então ele ficou na árvore de trabalho e não numa branch `prototype/`.

## Resolution

Escolhido pelo Rafael: **layout A, "Lista e folha"**.

- **Tela de revisão:** lista de itens à esquerda, em seções recolhíveis com contagem ("3 de 5 visíveis"), e a folha do PDF fixa à direita, com a marca de fim da página 1. Ordenar, ocultar, adicionar e ver o estouro de página acontecem na mesma tela.
- **Faixa fixa no topo:** vaga, requisitos cobertos de N, lacunas, barra de página (marca de 1 página) e a ação principal "Continuar para exportar". "Regenerar" fica ao lado.
- **Lacunas:** painel no topo da lista, com o requisito destacado como marca-texto e um atalho "+ bullet" por lacuna.
- **Controles por item:** subir, descer e ocultar/mostrar aparecem ao passar o mouse ou focar, e sempre no toque. O resumo troca de versão ("usar este").
- **Adicionar item na revisão:** bullet dentro de uma experiência, projeto ou skill, com tags opcionais. É salvo no mestre e entra visível, marcado "novo · a IA ainda não viu" até a próxima geração. Experiências novas e versões de resumo só se criam no formulário do mestre.
- **Fluxo do app:** cabeçalho fixo com as etapas clicáveis Mestre → Vaga → Revisão → Exportar. O PDF é baixado na etapa Exportar, que mostra páginas, lacunas e itens ocultos. Lacunas não bloqueiam a exportação. Mais de 2 páginas bloqueiam.
- **Descartadas:** B (por requisito) e C (documento único). A ideia do B de abrir o detalhe de uma lacuna pode voltar numa evolução.

Limites do protótipo: a medição de página era uma estimativa de linhas, e "Regenerar" simulava a IA casando tags com requisitos.

---
label: wayfinder:grilling
title: Contrato de seleção: o que a IA recebe e devolve
status: closed
assignee: rafael
blocked-by: [01-nvidia-build-api, 03-master-resume-schema]
---

## Question

Qual é a entrada e a saída exata da chamada de IA? Entrada: texto da vaga mais o mestre (ou só IDs e resumos dos itens). Saída: IDs selecionados, ordem por seção, itens ocultados e lacunas detectadas, validada por schema. Como tratar saída inválida (retry, erro visível)? Como a IA justifica cada escolha para a revisão?

## Contexto herdado

Ver [Provedor de IA e privacidade dos dados](07-ai-provider-and-privacy.md): a entrada da IA não pode conter nome nem contato, a chamada fica atrás de uma interface trocável e a saída é sempre validada em código.

## Resolution

Decidido com o Rafael:

- **Duas chamadas:** (1) extrair os requisitos da vaga em lista estruturada; (2) casar os requisitos com os itens. Os requisitos extraídos aparecem na revisão e alimentam as lacunas. Cada etapa tem um schema pequeno.
- **Saída da seleção:** `resumo` (ID da versão escolhida); por seção, lista **ordenada** de IDs dos itens a mostrar (quem não está na lista fica oculto); para cada item mostrado, os requisitos da vaga que ele cobre; `lacunas` (requisitos sem cobertura). Sem score numérico nem justificativa em texto livre: a ordem expressa a relevância e a cobertura é a justificativa.
- **Tamanho:** a IA não recebe orçamento de itens. Ela ordena por relevância, o app mede o PDF e avisa o estouro na revisão, e o Rafael decide o corte.
- **Saída inválida:** o código valida schema, IDs existentes, duplicatas, seção correta e itens "sempre visível". Correção automática do que não é ambíguo (IDs inexistentes, duplicatas, itens "sempre visível" ausentes). Schema quebrado: até 2 novas tentativas devolvendo o erro ao modelo. Se ainda falhar, erro claro e nenhum PDF parcial.
- **Itens "sempre visível":** ficam fora da decisão da IA. O app os insere nas posições fixas da seção.
- **Contexto enviado:** texto completo de todos os itens no MVP, sem pré-filtro (otimização futura se o mestre crescer).
- **Variação:** temperatura baixa e botão "regenerar". Cada geração fica no histórico da vaga e a revisão parte da última.

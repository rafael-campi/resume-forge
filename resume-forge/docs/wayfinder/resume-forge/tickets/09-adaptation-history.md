---
label: wayfinder:grilling
title: Histórico de adaptações por vaga
status: closed
assignee: rafael
blocked-by: []
---

## Question

O que o SQLite guarda por vaga? Texto da vaga, requisitos extraídos, cada geração (seleção, ordem, lacunas, modelo usado) e os ajustes manuais da revisão, para reproduzir um PDF. Como o Rafael consulta e reabre uma vaga antiga? O que acontece com o histórico quando itens do mestre são editados ou apagados depois? Cada geração, mais "regenerar", cria um registro novo?

## Resolution

Decidido com o Rafael (todas as recomendações aceitas):

- **Estrutura:** uma **vaga** com várias **gerações**. A vaga guarda título, empresa, texto original colado e os requisitos extraídos (primeira chamada da IA, que não muda ao regenerar). Cada geração guarda a seleção da IA (IDs, ordem por seção, cobertura por item), as lacunas e o modelo usado.
- **Ajustes manuais:** ficam numa camada à parte, aplicada por cima da seleção da IA. A geração guarda a escolha da IA intacta. O resultado final é a seleção mais os ajustes. Assim dá para saber o que o Rafael mudou, e regenerar não apaga os ajustes sem aviso.
- **Mestre editado depois:** cada geração guarda um **instantâneo do texto** de cada item mostrado, mantendo o ID para ligar ao item original quando ele ainda existir. Um currículo antigo continua fiel ao que foi enviado.
- **PDF exportado:** o arquivo e a data de exportação são guardados, como registro do que foi enviado. Os dados também permitem regenerar.
- **Reabrir uma vaga:** lista por data, mais recente primeiro, com título, empresa e estado (rascunho ou exportado), com busca por título e empresa. Reabrir leva à revisão da última geração. Um seletor mostra as anteriores, e voltar a uma antiga a torna a atual. Sem comparação lado a lado no MVP.
- **Exclusão:** definitiva, por vaga, com confirmação, levando as gerações e o PDF. Sem lixeira nem retenção automática.

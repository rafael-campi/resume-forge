---
label: wayfinder:grilling
title: Provedor de IA e privacidade dos dados
status: closed
assignee: rafael
blocked-by: []
---

## Question

A pesquisa sobre a NVIDIA Build mostrou que o tier de teste é só para avaliação, proíbe dados pessoais de pessoa identificável e não serve para produção (ver [NVIDIA Build (NIM): API, modelos, saída estruturada e limites](01-nvidia-build-api.md)). Como isso muda o plano?

- No MVP local, usar a NVIDIA Build enviando só texto da vaga e itens por ID, sem nome nem contato?
- O texto dos itens (empresas, projetos) já identifica o Rafael? Isso é aceitável?
- Para a hospedagem futura: assinatura, NIM auto-hospedado ou trocar de provedor? Isso é decisão agora ou fog?
- A interface com o provedor fica atrás de uma camada trocável?

## Resolution

Decidido com o Rafael:

- **O que sai da máquina:** a vaga mais bullets, skills e tags de cada item, **sem** nome, e-mail, telefone, cidade nem links. Empresas e projetos ficam no texto. O currículo final é montado localmente. Risco residual aceito: o conteúdo ainda pode identificar o Rafael.
- **Enquadramento dos termos:** o MVP é tratado como avaliação pessoal e local. O Rafael aceita que a NVIDIA pode mudar ou cortar o serviço a qualquer momento (cláusula 8).
- **Interface trocável:** a chamada de IA fica atrás de um módulo com entrada e saída fixas (vaga + itens → seleção), com a NVIDIA como primeira implementação.
- **Hospedagem futura:** só registrada como restrição. Hospedar é produção e exigiria assinatura, NIM auto-hospedado ou outro provedor, decisão para quando houver hospedagem.
- **Se a chamada real falhar:** escalonar nesta ordem: tool calling ou validação em código com retry, depois trocar de modelo na NVIDIA, depois trocar de provedor. A validação em código (IDs existentes, sem duplicatas) é obrigatória sempre.
- **Teste de fumaça** na especificação final cobre os três pontos não confirmados: `guided_json` no endpoint hospedado, qualidade em português e limite de taxa real.

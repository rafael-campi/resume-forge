---
label: wayfinder:research
title: NVIDIA Build (NIM): API, modelos, saída estruturada e limites
status: closed
assignee:
blocked-by: []
---

## Question

O que a plataforma NVIDIA Build (build.nvidia.com / NIM) oferece para este uso? Fontes primárias apenas.

- Como autenticar e chamar a API (compatível com OpenAI?).
- Quais modelos servem para extrair requisitos de um texto de vaga em português e devolver uma seleção por ID.
- Suporte a saída estruturada (JSON schema / guided decoding / tool calling).
- Free tier, créditos, limites de taxa e custo por chamada.
- Termos de uso relevantes para dados pessoais (o currículo) e para hospedar depois.

## Pointer

Achados em [research/01-nvidia-build-api.md](../research/01-nvidia-build-api.md).

## Resolution

- **API:** compatível com OpenAI, em `POST https://integrate.api.nvidia.com/v1/chat/completions`. A chave é gerada em build.nvidia.com. O formato `nvapi-` com `Bearer` não foi confirmado em fonte primária.
- **Modelo candidato:** `meta/llama-3.3-70b-instruct` (português oficial, 128k de contexto). A qualidade real em português para esta tarefa **não foi verificada**.
- **Saída estruturada:** a doc recomenda `nvext.guided_json`, e há tool calling em vários modelos. Essas páginas descrevem o NIM auto-hospedado, então falta confirmar com uma chamada real que o endpoint hospedado aceita `guided_json` por modelo.
- **Limites e custo:** o tier gratuito é por créditos, sem valor na doc lida. Não há limite de taxa nem preço por token em fonte oficial.
- **Termos de uso (API Trial ToS):**
  - Sem assinatura, o uso é só para teste e avaliação, nunca produção.
  - É proibido enviar dados pessoais de pessoa identificável.
  - Hospedar o app depois seria produção e exigiria assinatura ou NIM auto-hospedado.
  - As cláusulas de retenção de conteúdo se contradizem em parte.
  - Mitigação sugerida: enviar à IA só o texto da vaga e os itens por ID, sem nome nem contato, e montar o currículo final localmente.

Esses termos afetam o destino. Abri o ticket "Provedor de IA e privacidade dos dados" para decidir.

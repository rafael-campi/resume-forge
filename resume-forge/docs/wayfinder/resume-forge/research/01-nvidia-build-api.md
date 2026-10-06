# NVIDIA Build (NIM): API, modelos, saída estruturada e limites

Ticket: [01-nvidia-build-api](../tickets/01-nvidia-build-api.md). Pesquisa feita em 2026-10-05, apenas fontes primárias (NVIDIA). Itens que não consegui confirmar numa fonte oficial estão marcados como **não verificado**.

## Resposta curta

- A API hospedada é compatível com OpenAI: `POST https://integrate.api.nvidia.com/v1/chat/completions`, com chave `nvapi-...` em `Authorization: Bearer`.
- Saída estruturada: o caminho recomendado pela NVIDIA é `extra_body={"nvext": {"guided_json": <schema>}}`. Tool calling também existe para as famílias Llama 3.x, Mistral, Nemotron e GPT-OSS.
- **Bloqueio de privacidade**: os Termos do API Trial proíbem enviar dados pessoais (2.6(a), 4.3) e uso em produção (1.2, 1.4). Um currículo contém dados pessoais. Isso afeta a decisão do projeto (ver "Implicações").

## 1. Autenticação e chamada

- Base URL e endpoint único `POST /v1/chat/completions`, seguindo a especificação de chat completions da OpenAI. Fonte: https://docs.api.nvidia.com/nim/reference/llm-apis
- Chave obtida em "Get API Key" na página de qualquer modelo em build.nvidia.com, após login/cadastro com conta NVIDIA. Fonte: https://docs.api.nvidia.com/nim/docs/api-quickstart
- Formato do header (`Bearer nvapi-...`) e a página de chaves (`build.nvidia.com/settings/api-keys`): **não confirmei na documentação oficial**; vieram de resultados de busca secundários. O quickstart oficial mostra o código Python com a chave na própria página do modelo, que é o lugar para conferir.
- Usar o SDK `openai` com `base_url="https://integrate.api.nvidia.com/v1"` é o padrão do exemplo oficial (guided_json abaixo usa `client.chat.completions.create`).

## 2. Modelos

- O catálogo hospedado tem 60+ modelos: Meta Llama (2, 3.1, 3.2, 3.3), Google Gemma, Mistral/Mixtral, NVIDIA Nemotron, DeepSeek, Qwen, Microsoft Phi, entre outros. Fonte: https://docs.api.nvidia.com/nim/reference/llm-apis
- Llama 3.3 70B Instruct: contexto 128k; português está entre os 8 idiomas oficialmente suportados (en, de, fr, it, pt, hi, es, th). Fonte: https://docs.api.nvidia.com/nim/reference/meta-llama-3_3-70b-instruct
- Llama-3.3-Nemotron-Super-49B-v1: 128k de contexto, forte em raciocínio e tool calling, modo de raciocínio liga/desliga por system prompt. Fonte: https://docs.api.nvidia.com/nim/reference/nvidia-llama-3_3-nemotron-super-49b-v1
- Candidatos para a tarefa (extrair requisitos de vaga em PT e escolher IDs): `meta/llama-3.3-70b-instruct` como primeira escolha (PT oficial, suporte a guided_json e a tool calling). Qualidade real em PT para esta tarefa **não verificada**; precisa de teste com vagas reais. A lista exata de modelos disponíveis muda; conferir em build.nvidia.com/models.

## 3. Saída estruturada

Fonte: https://docs.nvidia.com/nim/large-language-models/1.12.0/structured-generation.html

- `guided_json` é o recomendado: "We recommend that you use `guided_json` for optimal performance and reliability." Exemplo oficial:
  ```python
  response = client.chat.completions.create(
      model="meta/llama-3.1-70b-instruct",
      messages=messages,
      extra_body={"nvext": {"guided_json": json_schema}},
      stream=False
  )
  ```
- `response_format={"type": "json_object"}` é desaconselhado: permite qualquer JSON válido, inclusive objeto vazio.
- Outras restrições: `guided_choice` (lista fixa de opções), `guided_regex`, `guided_grammar` (EBNF).
- Backends: `xgrammar` (padrão, mais rápido), `outlines` (fallback), `lm-format-enforcer`. Nem toda configuração é suportada pelo xgrammar; o fallback para `outlines` pode causar lentidão, principalmente na primeira inferência.
- Essa página documenta o NIM auto-hospedado. Se o endpoint hospedado `integrate.api.nvidia.com` aceita `nvext.guided_json` para cada modelo **não está confirmado nas páginas de referência que consegui ler**; testar com uma chamada real antes de depender disso.
- Tool calling (https://docs.nvidia.com/nim/large-language-models/1.12.0/function-calling.html): habilitado automaticamente para GPT-OSS-20B/120B, Llama 3.1/3.2/3.3, Mistral e Llama Nemotron Nano/Super/Ultra. Parâmetros `tools` e `tool_choice` (`"none"`, `"auto"` ou ferramenta nomeada). Aviso oficial: se `tool_calls` vier vazio e a chamada aparecer em `content`, o parser não conseguiu pós-processar a saída. As variáveis `NIM_ENABLE_AUTO_TOOL_CHOICE`/`NIM_TOOL_CALL_PARSER` valem para auto-hospedagem.
- `response_format` com `json_schema` (estilo OpenAI): **não confirmado**; a página de API reference não carregou.
- Independente do mecanismo, o contrato por ID deve ser validado no código depois (IDs existentes, sem duplicatas), pois o schema garante forma, não verdade.

## 4. Free tier, créditos, limites e custo

- Os Termos do API Trial dizem que o acesso é por "limited use for a limited time", baseado em créditos (`Credits`) que a NVIDIA pode conceder e deduzir conforme o uso. Depois dos créditos ou para produção é preciso "Subscription" com a NVIDIA ou um provedor. Fonte: Termos, seção 1.4 (PDF abaixo).
- NVIDIA Developer Program dá acesso gratuito aos endpoints de API NIM em DGX Cloud e permite auto-hospedar NIM em até 16 GPUs para uso não comercial. Fonte: https://docs.api.nvidia.com/nim/docs/product
- Licença de produção (NVIDIA AI Enterprise): "licenses start at $4500 per GPU per year or ~ $1 per GPU per hour in the cloud". Mesma fonte. Produção = qualquer uso que não seja desenvolvimento, teste, pesquisa ou avaliação.
- Limite de taxa: um moderador da NVIDIA afirma que o limite do tier gratuito depende de "model, use-case and the amount of current overall traffic" e que não há como aumentá-lo no mesmo tier. Fonte (fórum oficial, resposta de moderador): https://forums.developer.nvidia.com/t/request-for-nvidia-build-api-rate-limit-increase-40-rpm-to-200-rpm/376729
- O valor "40 RPM" aparece nos títulos das discussões do fórum, mas **não achei em documentação oficial**. Tratar como valor observado, não garantido. Para uso pessoal (uma vaga por vez) não deve ser gargalo.
- Preço por chamada: **não existe preço por token publicado no tier gratuito**; o modelo é crédito/assinatura. Valor dos créditos iniciais: **não verificado** (a doc oficial lida não informa).

## 5. Termos de uso: dados pessoais e hospedagem

Fonte primária: NVIDIA API Trial Terms of Service, https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf (lido o PDF completo, p. 1-6).

- 1.2 Acesso "for limited trial purposes only and without use of the API Service or Generated Content in production".
- 1.4 Sem Subscription, "you may only use the API Service for internal testing and evaluation purposes, not in production".
- 2.6(a) Proibido incluir "personal data (unless expressly permitted by an API Service)", informação confidencial, dados sensíveis ou coletados em violação da lei.
- 4.3 Proibido enviar "any personal information relating to an identifiable individual"; a NVIDIA "specifically disclaims that NVIDIA servers are appropriate for processing of any data including personal data".
- 2.3 Salvo exceções divulgadas, a NVIDIA não armazena nem usa o conteúdo ao fim de cada sessão. 2.4 Para certos serviços (ex.: Fine Tuning) guarda 30/90 dias.
- 3.3 Coleta métricas, logs de erro/execução e, para melhorar produtos, User Content e Generated Content (sem identificar usuários). O uso é logado para segurança/fraude/abuso e compartilhado com provedores terceiros para esse fim. Há tensão entre 2.3 e 3.3; não está claro se o conteúdo do currículo seria retido.
- 2.2 Licença mundial à NVIDIA e afiliados sobre o conteúdo durante a sessão. 6.2/6.3 O usuário é dono do User Content e, em regra, do Generated Content.
- 4.2 Proibido distribuir ou disponibilizar a terceiros o API Service ou o Generated Content, salvo conforme 1.2. 4.12 Proibido usar o serviço para desenvolver produtos que o concorram.
- 8 A NVIDIA pode mudar, descontinuar ou depreciar o serviço a qualquer momento.

## Implicações para o projeto

1. **Hospedar depois = produção**, o que exige Subscription (1.4) ou NIM auto-hospedado com licença. Uso hospedado público no tier gratuito violaria os termos.
2. **Currículo com nome, e-mail, telefone**: mesmo sendo dados do próprio Rafael, 2.6(a) e 4.3 proíbem dados pessoais de pessoa identificável. Mitigação possível, a validar: enviar à IA apenas o texto da vaga e uma lista de itens por ID com texto anonimizado (sem nome/contato), e montar o currículo final localmente. O contrato "seleção por ID" do ticket 04 já favorece isso.
3. Pontos para decidir ou testar: se o endpoint hospedado aceita `guided_json` no modelo escolhido; qualidade em PT; limite de taxa real; saldo de créditos na conta.

## Fontes

- https://docs.api.nvidia.com/nim/reference/llm-apis
- https://docs.api.nvidia.com/nim/docs/api-quickstart
- https://docs.api.nvidia.com/nim/docs/product
- https://docs.api.nvidia.com/nim/reference/meta-llama-3_3-70b-instruct
- https://docs.api.nvidia.com/nim/reference/nvidia-llama-3_3-nemotron-super-49b-v1
- https://docs.nvidia.com/nim/large-language-models/1.12.0/structured-generation.html
- https://docs.nvidia.com/nim/large-language-models/1.12.0/function-calling.html
- https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf
- https://forums.developer.nvidia.com/t/request-for-nvidia-build-api-rate-limit-increase-40-rpm-to-200-rpm/376729

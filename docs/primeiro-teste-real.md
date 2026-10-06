# Primeiro teste real, passo a passo

Até aqui tudo foi testado com a **IA falsa** (só casa palavras). Este roteiro é o primeiro teste com a **NVIDIA Build de verdade**, e depois com o bot. Tempo total: cerca de 30 minutos, a maior parte esperando a IA.

O que você vai descobrir: se o modelo extrai bem os requisitos, se escolhe bem os itens do mestre e se o PDF sai como você mandaria.

## 0. Antes de começar: privacidade

O texto do seu mestre (empresas, projetos, bullets) vai para a NVIDIA. O seu **nome e o contato nunca vão**, mas o conteúdo ainda pode identificar você. Os termos do tier de teste da NVIDIA proíbem dados pessoais de pessoa identificável (a spec aceitou esse risco para uso pessoal e local).

Sugestão: faça a **Etapa A** (passos 1 a 7) com um mestre de mentira ou enxuto e uma vaga real. Só depois decida se quer rodar com o mestre de verdade.

## 1. Preparar (uma vez)

```bash
# Postgres (já está no ar, se o container estiver rodando)
cd apply-jobs && docker compose up -d db && cd ..

# Dependências do app e o Chromium que gera o PDF (~150 MB)
cd resume-forge
npm install
npx playwright install chromium
```

A chave da NVIDIA já está em `resume-forge/.env` (o Next carrega esse arquivo sozinho). Para conferir sem mostrar o valor: `grep -c '^NVIDIA_API_KEY=.\+' .env` deve imprimir `1`.

## 2. Teste rápido da chave (1 minuto, dados inventados)

```bash
cd resume-forge
NVIDIA_MODEL=google/gemma-4-31b-it npm run smoke:nvidia
```

Passe `NVIDIA_MODEL` sempre: o padrão do script é um modelo que a NVIDIA desativou.

- **Funcionou:** aparece uma seleção válida para as duas chamadas. Pode levar de 40 a 105 s. Siga adiante.
- **HTTP 401/403:** a chave está errada ou expirou.
- **HTTP 404/410:** o modelo saiu do ar. Veja os que sua conta enxerga (a chave não é impressa):
  ```bash
  cd resume-forge && set -a && . ./.env && set +a
  curl -s -H "Authorization: Bearer $NVIDIA_API_KEY" https://integrate.api.nvidia.com/v1/models | grep -oE '"id" ?: ?"[^"]*"' | head -40
  ```
  Escolha um modelo **sem raciocínio longo** e use-o em `NVIDIA_MODEL`.
- **HTTP 529:** serviço sobrecarregado. Tente de novo em alguns minutos.

## 3. Subir o app

```bash
cd resume-forge
npm run dev        # http://127.0.0.1:3000
```

Para usar outro modelo, crie `resume-forge/.env.local` com `NVIDIA_MODEL=...` e reinicie. O tempo limite por chamada é de 240 s (`NVIDIA_TIMEOUT_MS` muda).

## 4. Preencher o mestre (`/mestre`)

O mínimo para a IA ter o que escolher:

- **Dados pessoais:** nome, e-mail, telefone e cidade (só entram no PDF).
- **Resumo:** 2 versões diferentes (por exemplo, foco backend e foco full stack).
- **Experiência:** pelo menos 2 experiências com **4 ou mais bullets cada**. Quanto mais variados, mais a seleção faz diferença.
- **Skills** (com categoria), **Formação** e **Idiomas**.

Cada seção mostra Completa ou Pendente e salva sozinha.

## 5. Analisar uma vaga real (`/vagas/nova`)

1. Cole o texto de uma vaga que você realmente consideraria, com a lista de requisitos.
2. Clique em **Analisar vaga**. A tela mostra "Passo 1 de 2" e depois "Passo 2 de 2". Leva de **1 a 4 minutos**, e você pode sair da página.

**O que avaliar:**

| Pergunta | Bom sinal | Mau sinal |
|---|---|---|
| Os requisitos extraídos batem com a vaga? | Os mesmos pontos, em português, curtos | Requisitos que não estão na vaga, ou faltando |
| As lacunas são honestas? | Lacuna só onde seu mestre não tem aquilo | Algo marcado como coberto sem ter nada a ver |
| A ordem faz sentido? | O mais relevante vem primeiro | Itens fora de contexto no topo |
| Escolheu o resumo certo? | A versão mais próxima da vaga | Sempre a mesma, ignorando a vaga |
| Há "o código corrigiu sozinho"? | Nenhum ajuste, ou poucos | Muitos: o modelo está errando IDs |

Anote o que notar. Isso é o que guia o ajuste dos prompts depois.

## 6. Revisar e exportar

1. **Revisar e ajustar a seleção.** Suba, desça, oculte e mostre itens. Confira a folha à direita e o medidor de páginas.
2. Se houver lacuna que você **realmente** cobre, use **+ bullet** e escreva (ele é salvo no mestre).
3. **Continuar para exportar** e **Gerar PDF**. Abra o PDF baixado e confira:
   - 1 página (no máximo 2);
   - consegue **selecionar e copiar** o texto;
   - ordem Resumo, Skills, Experiência, Projetos, Formação, Idiomas;
   - nada que a IA tenha escrito: só frases suas.

## 7. (Opcional) Etapa B: o mestre de verdade

Repita os passos 4 a 6 com o mestre real. Compare a qualidade com a Etapa A.

## 8. O bot com o PDF adaptado

Só depois de o passo 6 funcionar bem. Este passo mexe no LinkedIn **de verdade**.

1. **Credenciais do bot** (ainda não existem): copie `apply-jobs/.env.example` para `apply-jobs/.env` e preencha `LINKEDIN_EMAIL` e `LINKEDIN_PASSWORD`. O `DATABASE_URL` já vem certo.
2. Em `apply-jobs/config.yaml`:
   ```yaml
   apply:
     mode: "confirmar"     # mantenha: você aprova cada envio
     curriculo: "forge"
     max_applications: 1   # um só, para o primeiro teste
   ```
3. Rode o bot:
   ```bash
   cd apply-jobs && .venv/bin/python main.py
   ```
4. **Primeira passada:** as vagas que passaram nos filtros e não têm PDF viram **Revisão manual** (o terminal diz isso), sem abrir o formulário.
5. No painel (`/candidaturas`), abra uma dessas vagas e clique em **Criar currículo adaptado a esta vaga**. Ela já vem preenchida. Analise, revise e exporte (passos 5 e 6).
6. **Segunda passada:** rode o bot de novo. Se a vaga voltar nos resultados da busca, ele anexa o PDF. No modo `confirmar` o formulário fica aberto: **confira no passo do currículo que o arquivo anexado é o `NNNN-N.pdf` certo** (fica em `apply-jobs/storage/curriculos/`) antes de responder `s`.

Se não quiser enviar nada, responda `N` e o bot descarta o formulário.

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "A IA não respondeu: HTTP 429/529" | Limite ou sobrecarga | Esperar e usar **Tentar de novo** (reaproveita os requisitos) |
| "A IA devolveu conteúdo vazio" | Modelo de raciocínio gastou os tokens pensando | Trocar `NVIDIA_MODEL` por um sem raciocínio longo |
| "Tempo esgotado" | Chamada passou de 240 s | Aumentar `NVIDIA_TIMEOUT_MS` ou trocar de modelo |
| "NVIDIA_API_KEY não está configurada" | Chave vazia ou o app não foi reiniciado | Conferir `.env` e reiniciar o `npm run dev` |
| "Não consegui abrir o Chromium" | Falta instalar | `npx playwright install chromium` (ou `CHROMIUM_PATH`) |
| "O currículo mestre ainda não tem um resumo..." | Mestre incompleto | Preencher resumo e uma experiência com bullets |
| Vaga fica em "Analisando" por mais de 10 min | O servidor foi reiniciado no meio | A tela oferece **Tentar de novo** |
| Bot: "as tabelas do resume-forge não existem" | O app nunca rodou neste banco | Abra o app uma vez (`npm run dev`) ou volte a `curriculo: "fixo"` |
| Bot não anexa o PDF | A vaga não voltou na busca ou não tem vínculo | Criar o currículo a partir da candidatura do painel (liga pelo job id) |

## O que me trazer depois

- Os requisitos que a IA extraiu **versus** os da vaga (o que errou ou inventou).
- Quanto tempo levou cada análise e se algum erro apareceu (copie a mensagem).
- Se a seleção e a ordem fizeram sentido, e o que você mudou na Revisão (o que você mexe muito mostra onde o prompt falha).
- Como ficou o PDF.

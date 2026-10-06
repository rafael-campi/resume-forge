---
label: wayfinder:grilling
title: Stack e arquitetura: TypeScript, framework e persistência
status: closed
assignee: rafael
blocked-by: []
---

## Question

Qual framework TypeScript (Next.js, Vite + backend leve, outro)? Onde a chave da API de IA mora para que funcione local hoje e hospedada depois? SQLite local agora e Postgres depois: qual camada de acesso a dados torna a troca barata? Como o código se organiza para que o módulo de seleção, o de PDF e o de persistência sejam testáveis separados?

## Resolution

Decidido com o Rafael:

- **Framework:** Next.js (App Router), um projeto e um processo. As rotas de servidor guardam a chave da IA e orquestram os módulos.
- **PDF:** Chromium headless (Puppeteer ou Playwright), renderizando o mesmo HTML usado no preview da revisão. Fontes embutidas no projeto. Medição de página: contar as páginas do PDF gerado. Custo conhecido: depender de um Chromium na hospedagem futura.
- **Dados:** Drizzle ORM com SQLite agora e Postgres depois (troca de driver e dialeto), com uma interface de repositório por cima.
- **Chave da IA:** variável de ambiente lida só no servidor, em `.env.local` fora do git. Sem cofre de segredos no MVP.
- **Módulos independentes:**
  - seleção: `extrairRequisitos(vaga)` e `selecionar(requisitos, itens)`, com o cliente da IA atrás de uma interface; validação e correção da saída em funções puras;
  - PDF: `renderizar(curriculoAdaptado) → bytes`;
  - persistência: repositórios do mestre e do histórico.
  Uma camada fina de rotas orquestra os três.
- **Execução:** um comando e um arquivo SQLite local. Docker só na hospedagem futura.
- **Testes:** unitários na validação e correção da saída da IA; PDF com currículo fixo, medindo páginas e extraindo o texto para checar a ordem de leitura; teste de fumaça manual da NVIDIA Build; sem testes de ponta a ponta no MVP.

Pendente de verificação (herdado da pesquisa): requisitos de Chromium em provedores de hospedagem. Só importa na hospedagem, que está fora de escopo.

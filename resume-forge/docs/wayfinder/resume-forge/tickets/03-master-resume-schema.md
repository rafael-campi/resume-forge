---
label: wayfinder:grilling
title: Schema do currículo mestre e formulário de preenchimento
status: closed
assignee: rafael
blocked-by: []
---

## Question

Quais seções e campos o currículo mestre tem (dados pessoais, resumo, experiências, projetos, formação, skills, certificações, idiomas)? Cada item precisa de ID estável e talvez tags. Como o formulário coleta isso sem virar um fardo? Quais itens são obrigatórios, quais podem ser ocultados pela IA e quais ficam sempre fixos (como contato)?

## Resolution

Decidido com o Rafael:

- **Seções:** dados pessoais e contato, resumo, experiências, projetos, formação, skills, certificações, idiomas.
- **Unidade de seleção:** a IA seleciona e ordena **bullets** dentro de cada experiência e pode ocultar uma **experiência inteira**. Empresa, cargo e datas são fixos. O Rafael escreve vários bullets por experiência.
- **Skills:** cada skill é um item, com categoria opcional. A IA escolhe e ordena, e o PDF agrupa por categoria.
- **Resumo:** várias versões escritas pelo Rafael (por exemplo, foco backend, foco full stack). A IA escolhe uma e nunca escreve.
- **Tags:** opcionais por item (experiência, bullet, projeto), fora do PDF, só para o casamento com a vaga.
- **Itens fixos:** contato, formação e idiomas sempre aparecem. Qualquer item pode receber a flag "sempre visível". O resto é selecionável pela IA.
- **Formulário:** edição por seção (abas ou lista lateral), salvamento automático, indicador de completude por seção, sem wizard linear.
- **Ponto de partida:** o formulário parte do zero. Importar o currículo atual fica no fog.

Assumido por padrão, sem pergunta explícita (a revisar se discordar):
- Todo item recebe ID estável gerado automaticamente.
- Datas como mês/ano, com "atual" para o emprego em andamento.
- Contato com e-mail, telefone, cidade e links opcionais (LinkedIn, GitHub, site).
- Projetos e certificações são itens selecionáveis, como experiências.

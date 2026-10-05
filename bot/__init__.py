"""
bot
Bot de candidaturas Easy Apply do LinkedIn, em três camadas:

- bot.domain: regras do negócio (Vaga, Status, filtros); não conhece Selenium nem SQL.
- bot.repository: a única camada que fala com o Postgres.
- bot.linkedin: a única camada que fala com o Selenium e conhece seletores.
"""

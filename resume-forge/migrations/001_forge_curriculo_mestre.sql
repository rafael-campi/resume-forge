-- Currículo mestre do Rafael: um único documento (a IA precisa de todos os itens de uma vez).
-- Tabelas do resume-forge levam o prefixo forge_; as do bot (apply-jobs) não são tocadas.
CREATE TABLE forge_curriculo_mestre (
    id            SMALLINT PRIMARY KEY CHECK (id = 1),
    documento     JSONB NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

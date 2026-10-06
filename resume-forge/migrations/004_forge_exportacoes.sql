-- PDFs exportados. O apply-jobs (bot) lê o mais recente de cada vaga pelo job id (forge_vagas.job_id).
-- `instantaneo` é o texto exato que foi para o PDF (CurriculoFinal): o mestre pode mudar depois, o histórico não.
CREATE TABLE forge_exportacoes (
    id          SERIAL PRIMARY KEY,
    vaga_id     INTEGER NOT NULL REFERENCES forge_vagas (id) ON DELETE CASCADE,
    geracao_id  INTEGER NOT NULL REFERENCES forge_geracoes (id) ON DELETE CASCADE,
    paginas     INTEGER NOT NULL,
    arquivo     TEXT NOT NULL,
    pdf         BYTEA NOT NULL,
    instantaneo JSONB NOT NULL,
    exportada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX forge_exportacoes_vaga_idx ON forge_exportacoes (vaga_id, id);

-- Vagas coladas no resume-forge e as gerações de seleção da IA para cada uma.
-- job_id liga a vaga ao bot (vagas.job_id do apply-jobs), sem chave estrangeira: os bancos têm donos diferentes.
CREATE TABLE forge_vagas (
    id            SERIAL PRIMARY KEY,
    titulo        TEXT NOT NULL DEFAULT '',
    empresa       TEXT NOT NULL DEFAULT '',
    texto         TEXT NOT NULL,
    job_id        TEXT,
    estado        TEXT NOT NULL CHECK (estado IN ('analisando', 'pronta', 'erro')),
    etapa         TEXT CHECK (etapa IN ('requisitos', 'selecao')),
    erro          TEXT,
    requisitos    JSONB,
    criada_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX forge_vagas_job_id_idx ON forge_vagas (job_id);

CREATE TABLE forge_geracoes (
    id        SERIAL PRIMARY KEY,
    vaga_id   INTEGER NOT NULL REFERENCES forge_vagas (id) ON DELETE CASCADE,
    selecao   JSONB NOT NULL,
    ajustes   JSONB NOT NULL DEFAULT '[]',
    modelo    TEXT NOT NULL,
    criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX forge_geracoes_vaga_idx ON forge_geracoes (vaga_id, id);

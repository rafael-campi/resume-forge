-- Vagas, Candidaturas e o histórico de Status. A identidade de uma Vaga é o job id.
CREATE TABLE vagas (
    job_id      TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    company     TEXT NOT NULL,
    location    TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE candidaturas (
    job_id     TEXT PRIMARY KEY REFERENCES vagas (job_id),
    status     TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE candidatura_historico (
    id         BIGSERIAL PRIMARY KEY,
    job_id     TEXT NOT NULL REFERENCES vagas (job_id),
    status     TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX candidatura_historico_job_id_idx ON candidatura_historico (job_id, id);

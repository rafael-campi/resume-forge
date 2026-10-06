import pg from "pg";
import { criarRepositorioCandidaturas } from "./repositorio";

// Mesmo Postgres do bot (ver ADR 0001). O padrão é o container local de apply-jobs/docker-compose.yml.
const URL_PADRAO = "postgresql://apply_jobs:apply_jobs@localhost:5433/apply_jobs";

// Em `next dev` o módulo é recarregado; guardar o pool no globalThis evita abrir conexões a cada recarga.
const global = globalThis as unknown as { __poolCandidaturas?: pg.Pool };

export function repositorioCandidaturas() {
  global.__poolCandidaturas ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL ?? URL_PADRAO,
    max: 4,
  });
  return criarRepositorioCandidaturas(global.__poolCandidaturas);
}

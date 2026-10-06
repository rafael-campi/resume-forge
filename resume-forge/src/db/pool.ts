import pg from "pg";
import { migrar } from "./migrar";

// Mesmo Postgres do bot (ver ADR 0001). O padrão é o container local de apply-jobs/docker-compose.yml.
const URL_PADRAO = "postgresql://apply_jobs:apply_jobs@localhost:5433/apply_jobs";

// Em `next dev` os módulos são recarregados; guardar no globalThis evita abrir conexões a cada recarga.
const global = globalThis as unknown as { __forgePool?: pg.Pool; __forgeMigrado?: Promise<unknown> };

export function obterPool(): pg.Pool {
  global.__forgePool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL ?? URL_PADRAO, max: 4 });
  return global.__forgePool;
}

/** Aplica as migrações do resume-forge uma vez por processo. Se falhar, a próxima chamada tenta de novo. */
export async function bancoPronto(): Promise<pg.Pool> {
  const pool = obterPool();
  global.__forgeMigrado ??= (async () => {
    const conexao = await pool.connect();
    try {
      await migrar(conexao);
    } finally {
      conexao.release();
    }
  })().catch((erro) => {
    global.__forgeMigrado = undefined;
    throw erro;
  });
  await global.__forgeMigrado;
  return pool;
}

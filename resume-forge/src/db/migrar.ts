import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Parte do `pg` que a migração usa: uma única conexão (o lock de aviso vale por sessão). */
export interface Conexao {
  query(texto: string, valores?: unknown[]): Promise<{ rows: any[] }>;
}

const TRAVA = 727001; // chave do pg_advisory_lock: serializa quem sobe junto (workers do Next)

/** Aplica as migrações .sql de `pasta` ainda não aplicadas, em ordem. Devolve as versões aplicadas. */
export async function migrar(db: Conexao, pasta = join(process.cwd(), "migrations")): Promise<string[]> {
  await db.query("SELECT pg_advisory_lock($1)", [TRAVA]);
  try {
    await db.query(
      "CREATE TABLE IF NOT EXISTS forge_migracoes (versao TEXT PRIMARY KEY, aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const feitas = new Set((await db.query("SELECT versao FROM forge_migracoes")).rows.map((r) => r.versao));
    const aplicadas: string[] = [];
    for (const arquivo of readdirSync(pasta).filter((f) => f.endsWith(".sql")).sort()) {
      const versao = arquivo.replace(/\.sql$/, "");
      if (!/^[0-9a-z_]+$/.test(versao)) throw new Error(`Nome de migração inválido: ${arquivo}`);
      if (feitas.has(versao)) continue;
      // Consulta com vários comandos roda numa transação implícita: ou aplica tudo, ou nada.
      await db.query(`${readFileSync(join(pasta, arquivo), "utf-8")}\n;INSERT INTO forge_migracoes (versao) VALUES ('${versao}')`);
      aplicadas.push(versao);
    }
    return aplicadas;
  } finally {
    await db.query("SELECT pg_advisory_unlock($1)", [TRAVA]);
  }
}

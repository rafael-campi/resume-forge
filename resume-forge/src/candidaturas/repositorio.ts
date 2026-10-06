import { lerStatus, STATUS } from "./tipos";
import type { Candidatura, DetalheCandidatura, Filtro, Listagem, Resumo } from "./tipos";

/** Qualquer coisa com `query` no formato do `pg` (Pool ou Client). */
export interface Consulta {
  query(texto: string, valores?: unknown[]): Promise<{ rows: any[] }>;
}

export interface RepositorioCandidaturas {
  /** Quantas Candidaturas há em cada Status (zero para os vazios). */
  resumo(): Promise<Resumo>;
  /** Mais recentes primeiro. `total` ignora o limite. */
  listar(filtro: Filtro): Promise<Listagem>;
  detalhe(jobId: string): Promise<DetalheCandidatura | null>;
}

const LIMITE_PADRAO = 100;

function paraCandidatura(r: any): Candidatura {
  return {
    jobId: r.job_id,
    titulo: r.title,
    empresa: r.company,
    local: r.location,
    status: lerStatus(r.status),
    atualizadaEm: r.updated_at,
  };
}

/** Escapa % e _ para a busca tratá-los como texto. */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function criarRepositorioCandidaturas(db: Consulta): RepositorioCandidaturas {
  return {
    async resumo() {
      const { rows } = await db.query("SELECT status, count(*)::int AS n FROM candidaturas GROUP BY status");
      const resumo = Object.fromEntries(STATUS.map((s) => [s, 0])) as Resumo;
      for (const r of rows) resumo[lerStatus(r.status)] = r.n;
      return resumo;
    },

    async listar(filtro) {
      const valores: unknown[] = [];
      const condicoes: string[] = [];
      if (filtro.status) {
        valores.push(filtro.status);
        condicoes.push(`c.status = $${valores.length}`);
      }
      const busca = filtro.busca?.trim();
      if (busca) {
        valores.push(`%${escaparLike(busca)}%`);
        condicoes.push(`(v.title ILIKE $${valores.length} OR v.company ILIKE $${valores.length})`);
      }
      const onde = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";
      const base = `FROM vagas v JOIN candidaturas c ON c.job_id = v.job_id ${onde}`;

      const total = await db.query(`SELECT count(*)::int AS n ${base}`, valores);
      const { rows } = await db.query(
        `SELECT v.job_id, v.title, v.company, v.location, c.status, c.updated_at ${base}
         ORDER BY c.updated_at DESC, v.job_id LIMIT $${valores.length + 1}`,
        [...valores, filtro.limite ?? LIMITE_PADRAO],
      );
      return { linhas: rows.map(paraCandidatura), total: total.rows[0].n };
    },

    async detalhe(jobId) {
      const { rows } = await db.query(
        `SELECT v.job_id, v.title, v.company, v.location, v.description, c.status, c.updated_at
         FROM vagas v JOIN candidaturas c ON c.job_id = v.job_id WHERE v.job_id = $1`,
        [jobId],
      );
      if (!rows[0]) return null;
      const historico = await db.query(
        "SELECT status, changed_at FROM candidatura_historico WHERE job_id = $1 ORDER BY id",
        [jobId],
      );
      return {
        ...paraCandidatura(rows[0]),
        descricao: rows[0].description,
        historico: historico.rows.map((h) => ({ status: lerStatus(h.status), em: h.changed_at })),
      };
    },
  };
}

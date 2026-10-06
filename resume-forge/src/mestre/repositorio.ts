import type { Consulta } from "../candidaturas/repositorio";
import { ESQUEMA_SECAO, esquemaMestre, idsRepetidos, mestreVazio } from "./esquema";
import type { Mestre, Secao } from "./esquema";

export type ResultadoSalvar = { ok: true } | { ok: false; erros: string[] };

export interface RepositorioMestre {
  /** O mestre atual; vazio se ainda não foi salvo nada. */
  ler(): Promise<Mestre>;
  /** Valida e grava só esta seção, de forma atômica: abas diferentes não se sobrescrevem. */
  salvarSecao(secao: Secao, valor: unknown): Promise<ResultadoSalvar>;
}

export function criarRepositorioMestre(db: Consulta): RepositorioMestre {
  return {
    async ler() {
      const { rows } = await db.query("SELECT documento FROM forge_curriculo_mestre WHERE id = 1");
      return rows[0] ? esquemaMestre.parse(rows[0].documento) : mestreVazio();
    },

    async salvarSecao(secao, valor) {
      if (!(secao in ESQUEMA_SECAO)) return { ok: false, erros: [`Seção desconhecida: ${secao}`] };
      const r = ESQUEMA_SECAO[secao].safeParse(valor);
      if (!r.success) return { ok: false, erros: r.error.issues.map((i) => `${i.path.join(".") || secao}: ${i.message}`) };
      const repetidos = idsRepetidos(r.data);
      if (repetidos.length) return { ok: false, erros: [`IDs repetidos: ${repetidos.join(", ")}`] };

      await db.query(
        `INSERT INTO forge_curriculo_mestre (id, documento)
         VALUES (1, jsonb_build_object($1::text, $2::jsonb))
         ON CONFLICT (id) DO UPDATE
           SET documento = forge_curriculo_mestre.documento || jsonb_build_object($1::text, $2::jsonb),
               atualizado_em = now()`,
        [secao, JSON.stringify(r.data)],
      );
      return { ok: true };
    },
  };
}

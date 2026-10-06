import type { Consulta } from "../candidaturas/repositorio";
import type { CurriculoFinal } from "../curriculo/montar";

export type Exportacao = { id: number; vagaId: number; geracaoId: number; paginas: number; arquivo: string; exportadaEm: Date };

export interface RepositorioExportacoes {
  gravar(e: { vagaId: number; geracaoId: number; paginas: number; arquivo: string; pdf: Buffer; instantaneo: CurriculoFinal }): Promise<number>;
  /** Da mais recente para a mais antiga. Sem os bytes do PDF. */
  listar(vagaId: number): Promise<Exportacao[]>;
  pdf(id: number): Promise<Buffer | null>;
}

export function criarRepositorioExportacoes(db: Consulta): RepositorioExportacoes {
  return {
    async gravar(e) {
      const { rows } = await db.query(
        `INSERT INTO forge_exportacoes (vaga_id, geracao_id, paginas, arquivo, pdf, instantaneo)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING id`,
        [e.vagaId, e.geracaoId, e.paginas, e.arquivo, e.pdf, JSON.stringify(e.instantaneo)],
      );
      return rows[0].id;
    },
    async listar(vagaId) {
      const { rows } = await db.query(
        "SELECT id, vaga_id, geracao_id, paginas, arquivo, exportada_em FROM forge_exportacoes WHERE vaga_id = $1 ORDER BY id DESC",
        [vagaId],
      );
      return rows.map((r) => ({ id: r.id, vagaId: r.vaga_id, geracaoId: r.geracao_id, paginas: r.paginas, arquivo: r.arquivo, exportadaEm: r.exportada_em }));
    },
    async pdf(id) {
      const { rows } = await db.query("SELECT pdf FROM forge_exportacoes WHERE id = $1", [id]);
      return rows[0]?.pdf ?? null;
    },
  };
}

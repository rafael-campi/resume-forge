import type { Consulta } from "../candidaturas/repositorio";
import type { Requisito, Selecao } from "../selecao/tipos";
import type { DetalheVaga, EstadoVaga, NovaVaga, ResumoVaga } from "./tipos";

export interface RepositorioVagas {
  criar(vaga: NovaVaga): Promise<number>;
  obter(id: number): Promise<DetalheVaga | null>;
  /** A vaga já criada para este job id do LinkedIn, se houver. */
  porJobId(jobId: string): Promise<number | null>;
  /** Mais recentes primeiro. */
  listar(): Promise<ResumoVaga[]>;
  /** Volta a "analisando" (nova análise ou nova tentativa). Mantém os requisitos já extraídos. */
  iniciarAnalise(id: number): Promise<void>;
  gravarRequisitos(id: number, requisitos: Requisito[]): Promise<void>;
  /** Guarda a geração e marca a vaga como pronta, de uma vez. */
  gravarGeracao(id: number, g: { selecao: Selecao; ajustes: string[]; modelo: string }): Promise<void>;
  marcarErro(id: number, mensagem: string): Promise<void>;
  /** Exclusão definitiva, com as gerações. */
  excluir(id: number): Promise<void>;
}

// Passou disso "analisando", o processo que analisava caiu (cada chamada à IA tem timeout de poucos minutos).
const INTERROMPIDA_APOS = "10 minutes";

export function criarRepositorioVagas(db: Consulta): RepositorioVagas {
  return {
    async criar(v) {
      const { rows } = await db.query(
        `INSERT INTO forge_vagas (titulo, empresa, texto, job_id, estado, etapa)
         VALUES ($1, $2, $3, $4, 'analisando', 'requisitos') RETURNING id`,
        [v.titulo, v.empresa, v.texto, v.jobId],
      );
      return rows[0].id;
    },

    async obter(id) {
      const { rows } = await db.query(
        `SELECT *, (estado = 'analisando' AND atualizada_em < now() - interval '${INTERROMPIDA_APOS}') AS interrompida
         FROM forge_vagas WHERE id = $1`,
        [id],
      );
      const r = rows[0];
      if (!r) return null;
      const g = await db.query(
        `SELECT id, selecao, ajustes, modelo, criada_em,
                (SELECT count(*)::int FROM forge_geracoes WHERE vaga_id = $1) AS numero
         FROM forge_geracoes WHERE vaga_id = $1 ORDER BY id DESC LIMIT 1`,
        [id],
      );
      const ultima = g.rows[0];
      return {
        id: r.id, titulo: r.titulo, empresa: r.empresa, estado: r.estado as EstadoVaga, criadaEm: r.criada_em,
        texto: r.texto, jobId: r.job_id, etapa: r.etapa, erro: r.erro, requisitos: r.requisitos,
        interrompida: r.interrompida,
        geracao: ultima
          ? { id: ultima.id, numero: ultima.numero, selecao: ultima.selecao, ajustes: ultima.ajustes, modelo: ultima.modelo, criadaEm: ultima.criada_em }
          : null,
      };
    },

    async porJobId(jobId) {
      const { rows } = await db.query("SELECT id FROM forge_vagas WHERE job_id = $1 ORDER BY id DESC LIMIT 1", [jobId]);
      return rows[0]?.id ?? null;
    },

    async listar() {
      const { rows } = await db.query("SELECT id, titulo, empresa, estado, criada_em FROM forge_vagas ORDER BY id DESC");
      return rows.map((r) => ({ id: r.id, titulo: r.titulo, empresa: r.empresa, estado: r.estado, criadaEm: r.criada_em }));
    },

    async iniciarAnalise(id) {
      await db.query(
        "UPDATE forge_vagas SET estado = 'analisando', etapa = CASE WHEN requisitos IS NULL THEN 'requisitos' ELSE 'selecao' END, erro = NULL, atualizada_em = now() WHERE id = $1",
        [id],
      );
    },

    async gravarRequisitos(id, requisitos) {
      await db.query(
        "UPDATE forge_vagas SET requisitos = $2::jsonb, etapa = 'selecao', atualizada_em = now() WHERE id = $1",
        [id, JSON.stringify(requisitos)],
      );
    },

    async gravarGeracao(id, g) {
      await db.query(
        `WITH nova AS (
           INSERT INTO forge_geracoes (vaga_id, selecao, ajustes, modelo) VALUES ($1, $2::jsonb, $3::jsonb, $4)
         )
         UPDATE forge_vagas SET estado = 'pronta', etapa = NULL, erro = NULL, atualizada_em = now() WHERE id = $1`,
        [id, JSON.stringify(g.selecao), JSON.stringify(g.ajustes), g.modelo],
      );
    },

    async marcarErro(id, mensagem) {
      await db.query("UPDATE forge_vagas SET estado = 'erro', etapa = NULL, erro = $2, atualizada_em = now() WHERE id = $1", [id, mensagem]);
    },

    async excluir(id) {
      await db.query("DELETE FROM forge_vagas WHERE id = $1", [id]);
    },
  };
}

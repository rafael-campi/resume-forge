import type { Consulta } from "../candidaturas/repositorio";
import type { Requisito, Selecao } from "../selecao/tipos";
import type { DetalheVaga, EstadoVaga, NovaVaga, ResumoGeracao, ResumoVaga } from "./tipos";

export interface RepositorioVagas {
  criar(vaga: NovaVaga): Promise<number>;
  /** `geracaoId` escolhe uma geração da vaga; sem ele, vale a mais recente. */
  obter(id: number, geracaoId?: number): Promise<DetalheVaga | null>;
  /** As gerações da vaga, da mais recente para a mais antiga. */
  listarGeracoes(id: number): Promise<ResumoGeracao[]>;
  /** Voltar a uma geração antiga a torna a atual: copia (seleção e ajustes) para uma nova, a mais recente. Devolve o id da cópia. */
  copiarGeracao(geracaoId: number): Promise<number>;
  /** A vaga já criada para este job id do LinkedIn, se houver. */
  porJobId(jobId: string): Promise<number | null>;
  /** Mais recentes primeiro. */
  listar(): Promise<ResumoVaga[]>;
  /** Volta a "analisando" (nova análise ou nova tentativa). Mantém os requisitos já extraídos. */
  iniciarAnalise(id: number): Promise<void>;
  gravarRequisitos(id: number, requisitos: Requisito[]): Promise<void>;
  /** Guarda os ajustes da Revisão desta geração, sem tocar na seleção da IA. */
  gravarRevisao(geracaoId: number, revisao: unknown): Promise<void>;
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

    async obter(id, geracaoId) {
      const { rows } = await db.query(
        `SELECT *, (estado = 'analisando' AND atualizada_em < now() - interval '${INTERROMPIDA_APOS}') AS interrompida
         FROM forge_vagas WHERE id = $1`,
        [id],
      );
      const r = rows[0];
      if (!r) return null;
      const g = await db.query(
        `SELECT id, selecao, ajustes, modelo, criada_em, revisao,
                (SELECT count(*)::int FROM forge_geracoes x WHERE x.vaga_id = g.vaga_id AND x.id <= g.id) AS numero
         FROM forge_geracoes g WHERE vaga_id = $1
         ORDER BY (id = $2::int) DESC NULLS LAST, id DESC LIMIT 1`, // o pedido, se for desta vaga; senão, a mais recente
        [id, geracaoId ?? null],
      );
      const ultima = g.rows[0];
      return {
        id: r.id, titulo: r.titulo, empresa: r.empresa, estado: r.estado as EstadoVaga, criadaEm: r.criada_em,
        texto: r.texto, jobId: r.job_id, etapa: r.etapa, erro: r.erro, requisitos: r.requisitos,
        interrompida: r.interrompida,
        geracao: ultima
          ? { id: ultima.id, numero: ultima.numero, selecao: ultima.selecao, ajustes: ultima.ajustes, modelo: ultima.modelo, criadaEm: ultima.criada_em, revisao: ultima.revisao }
          : null,
      };
    },

    async listarGeracoes(id) {
      const { rows } = await db.query(
        `SELECT id, modelo, criada_em, (revisao IS NOT NULL) AS ajustada,
                (SELECT count(*)::int FROM forge_geracoes x WHERE x.vaga_id = g.vaga_id AND x.id <= g.id) AS numero
         FROM forge_geracoes g WHERE vaga_id = $1 ORDER BY id DESC`,
        [id],
      );
      return rows.map((r) => ({ id: r.id, numero: r.numero, modelo: r.modelo, criadaEm: r.criada_em, ajustada: r.ajustada }));
    },

    async copiarGeracao(geracaoId) {
      const { rows } = await db.query(
        `INSERT INTO forge_geracoes (vaga_id, selecao, ajustes, modelo, revisao)
         SELECT vaga_id, selecao, ajustes, modelo, revisao FROM forge_geracoes WHERE id = $1 RETURNING id`,
        [geracaoId],
      );
      return rows[0].id;
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

    async gravarRevisao(geracaoId, revisao) {
      await db.query("UPDATE forge_geracoes SET revisao = $2::jsonb WHERE id = $1", [geracaoId, JSON.stringify(revisao)]);
    },

    async marcarErro(id, mensagem) {
      await db.query("UPDATE forge_vagas SET estado = 'erro', etapa = NULL, erro = $2, atualizada_em = now() WHERE id = $1", [id, mensagem]);
    },

    async excluir(id) {
      await db.query("DELETE FROM forge_vagas WHERE id = $1", [id]);
    },
  };
}

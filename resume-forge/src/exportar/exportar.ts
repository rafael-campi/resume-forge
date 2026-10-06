import { montarCurriculo } from "../curriculo/montar";
import type { CurriculoFinal } from "../curriculo/montar";
import type { RepositorioMestre } from "../mestre/repositorio";
import type { PdfGerado } from "../pdf/gerar";
import { carregarEstado } from "../revisao/carregar";
import type { RepositorioVagas } from "../vagas/repositorio";
import type { RepositorioExportacoes } from "./repositorio";

/** Mais que isso bloqueia a exportação (spec, seção 6). */
export const MAX_PAGINAS = 2;

export type DepsExportar = {
  vagas: RepositorioVagas;
  mestre: RepositorioMestre;
  exportacoes: RepositorioExportacoes;
  gerar: (c: CurriculoFinal) => Promise<PdfGerado>;
};
export type ResultadoExportar = { ok: true; exportacaoId: number; paginas: number } | { ok: false; erro: string; paginas?: number };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const slug = (s: string) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** "curriculo-rafael-campi-acme.pdf" */
export function nomeDoArquivo(nome: string, empresa: string): string {
  return ["curriculo", slug(nome), slug(empresa)].filter(Boolean).join("-") + ".pdf";
}

/**
 * Gera o PDF da seleção (com os ajustes) e o guarda, com um instantâneo do texto exportado.
 * O número de páginas é o do PDF de verdade; acima de 2, nada é guardado.
 */
export async function exportar(d: DepsExportar, vagaId: number, geracaoId?: number): Promise<ResultadoExportar> {
  const vaga = await d.vagas.obter(vagaId, geracaoId);
  if (!vaga?.geracao) return { ok: false, erro: "Esta vaga ainda não tem uma seleção para exportar." };

  const mestre = await d.mestre.ler();
  const curriculo = montarCurriculo(mestre, carregarEstado(vaga.geracao.revisao, mestre, vaga.geracao.selecao));

  let gerado: PdfGerado;
  try {
    gerado = await d.gerar(curriculo);
  } catch (erro) {
    console.error(`Falha ao gerar o PDF da vaga ${vagaId}:`, erro);
    return { ok: false, erro: erro instanceof Error ? erro.message : "Não consegui gerar o PDF." };
  }

  if (gerado.paginas > MAX_PAGINAS) {
    return { ok: false, paginas: gerado.paginas, erro: `O PDF ficou com ${gerado.paginas} páginas e o máximo é ${MAX_PAGINAS}. Oculte itens na Revisão e tente de novo.` };
  }

  const exportacaoId = await d.exportacoes.gravar({
    vagaId,
    geracaoId: vaga.geracao.id,
    paginas: gerado.paginas,
    arquivo: nomeDoArquivo(curriculo.contato.nome, vaga.empresa),
    pdf: gerado.pdf,
    instantaneo: curriculo,
  });
  return { ok: true, exportacaoId, paginas: gerado.paginas };
}

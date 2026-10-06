import type { RepositorioMestre } from "../mestre/repositorio";
import { paraItensMestre } from "../mestre/itens";
import { extrairRequisitos, selecionar } from "../selecao/selecao";
import { ErroIA, ErroSelecao } from "../selecao/tipos";
import type { ClienteIA } from "../selecao/tipos";
import type { RepositorioVagas } from "./repositorio";

export type DepsAnalise = {
  vagas: RepositorioVagas;
  mestre: RepositorioMestre;
  /** Criado só na hora de analisar: uma chave ausente vira erro na vaga, não falha ao subir o app. */
  criarIa: () => { cliente: ClienteIA; modelo: string };
};

function mensagemDe(e: unknown): string {
  if (e instanceof ErroIA && e.tipo === "servico") return `A IA não respondeu: ${e.message} Tente de novo em alguns minutos.`;
  if (e instanceof ErroSelecao) return `${e.message} Detalhe: ${e.erros.join("; ")}`;
  if (e instanceof ErroIA) return e.message;
  return `Erro inesperado: ${e instanceof Error ? e.message : String(e)}`;
}

/**
 * Extrai os requisitos da vaga e pede à IA a seleção dos itens do mestre, guardando cada etapa.
 * Nunca lança: qualquer falha vira o estado "erro" da vaga, com uma mensagem para a pessoa.
 * Numa nova tentativa, reaproveita os requisitos já extraídos.
 */
export async function analisarVaga(d: DepsAnalise, vagaId: number): Promise<void> {
  try {
    const vaga = await d.vagas.obter(vagaId);
    if (!vaga) return;

    const itens = paraItensMestre(await d.mestre.ler());
    if (itens.resumos.length === 0 || !itens.experiencias.some((e) => e.bullets.length > 0)) {
      await d.vagas.marcarErro(vagaId, "O currículo mestre ainda não tem um resumo e uma experiência com bullets. Complete o mestre e tente de novo.");
      return;
    }

    const { cliente, modelo } = d.criarIa();
    let requisitos = vaga.requisitos;
    if (!requisitos) {
      const texto = [vaga.titulo, vaga.empresa, vaga.texto].filter((t) => t.trim()).join("\n");
      requisitos = await extrairRequisitos(cliente, texto);
      await d.vagas.gravarRequisitos(vagaId, requisitos);
    }
    const { selecao, ajustes } = await selecionar(cliente, requisitos, itens);
    await d.vagas.gravarGeracao(vagaId, { selecao, ajustes, modelo });
  } catch (e) {
    console.error(`Falha ao analisar a vaga ${vagaId}:`, e);
    await d.vagas.marcarErro(vagaId, mensagemDe(e)).catch((e2) => console.error("Falha ao registrar o erro:", e2));
  }
}

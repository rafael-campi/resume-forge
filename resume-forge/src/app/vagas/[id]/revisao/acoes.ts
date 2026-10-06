"use server";

import { revalidatePath } from "next/cache";
import { repositorioMestre } from "../../../../mestre/pool";
import { esquemaEstadoRevisao } from "../../../../revisao/esquema";
import { adicionarAoMestre } from "../../../../revisao/novoItem";
import type { EntradaNovoItem, ResultadoNovoItem } from "../../../../revisao/novoItem";
import { repositorioVagas } from "../../../../vagas/pool";

type Resultado = { ok: true } | { ok: false; erros: string[] };

/** Guarda os ajustes da pessoa, numa camada à parte: a seleção da IA não é tocada. */
export async function salvarRevisao(geracaoId: number, estado: unknown): Promise<Resultado> {
  if (!Number.isInteger(geracaoId)) return { ok: false, erros: ["geração inválida"] };
  const lido = esquemaEstadoRevisao.safeParse(estado);
  if (!lido.success) return { ok: false, erros: lido.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  try {
    await (await repositorioVagas()).gravarRevisao(geracaoId, lido.data);
    return { ok: true };
  } catch (erro) {
    console.error("Falha ao salvar a revisão:", erro);
    return { ok: false, erros: ["não consegui falar com o banco de dados"] };
  }
}

/** Cria o item no mestre. Quem o põe na seleção é o navegador, que também guarda a revisão. */
export async function criarItem(entrada: EntradaNovoItem): Promise<ResultadoNovoItem> {
  try {
    const r = await adicionarAoMestre(await repositorioMestre(), entrada);
    if (r.ok) revalidatePath("/mestre", "layout");
    return r;
  } catch (erro) {
    console.error("Falha ao criar o item no mestre:", erro);
    return { ok: false, erro: "Não consegui salvar no mestre. Tente de novo." };
  }
}

/** Voltar a uma seleção antiga a torna a atual (vira uma cópia mais recente). Devolve o id da cópia. */
export async function tornarAtual(geracaoId: number): Promise<number> {
  if (!Number.isInteger(geracaoId)) throw new Error("geração inválida");
  return (await repositorioVagas()).copiarGeracao(geracaoId);
}

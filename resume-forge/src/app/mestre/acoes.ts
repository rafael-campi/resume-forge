"use server";

import { revalidatePath } from "next/cache";
import { repositorioMestre } from "../../mestre/pool";
import type { ResultadoSalvar } from "../../mestre/repositorio";
import type { Secao } from "../../mestre/esquema";

export async function salvarSecao(secao: Secao, valor: unknown): Promise<ResultadoSalvar> {
  try {
    const resultado = await (await repositorioMestre()).salvarSecao(secao, valor);
    if (resultado.ok) revalidatePath("/mestre", "layout"); // atualiza os indicadores de completude
    return resultado;
  } catch (erro) {
    console.error("Falha ao salvar o mestre:", erro);
    return { ok: false, erros: ["não consegui falar com o banco de dados"] };
  }
}

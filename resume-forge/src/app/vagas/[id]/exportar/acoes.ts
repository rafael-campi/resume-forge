"use server";

import { revalidatePath } from "next/cache";
import { exportar } from "../../../../exportar/exportar";
import type { ResultadoExportar } from "../../../../exportar/exportar";
import { depsDeExportacao } from "../../../../exportar/pool";

/** Gera o PDF com o Chromium (leva alguns segundos), confere as páginas e guarda. */
export async function gerarExportacao(vagaId: number, geracaoId: number): Promise<ResultadoExportar> {
  if (!Number.isInteger(vagaId) || !Number.isInteger(geracaoId)) return { ok: false, erro: "Vaga ou seleção inválida." };
  try {
    const r = await exportar(await depsDeExportacao(), vagaId, geracaoId);
    if (r.ok) revalidatePath(`/vagas/${vagaId}`, "layout");
    return r;
  } catch (erro) {
    console.error("Falha ao exportar:", erro);
    return { ok: false, erro: "Não consegui exportar. Confira se o Postgres está no ar e tente de novo." };
  }
}

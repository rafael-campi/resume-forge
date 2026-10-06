import { bancoPronto } from "../db/pool";
import { repositorioMestre } from "../mestre/pool";
import { gerarPdf } from "../pdf/gerar";
import { repositorioVagas } from "../vagas/pool";
import { criarRepositorioExportacoes } from "./repositorio";
import type { DepsExportar } from "./exportar";

export async function repositorioExportacoes() {
  return criarRepositorioExportacoes(await bancoPronto());
}

export async function depsDeExportacao(): Promise<DepsExportar> {
  return { vagas: await repositorioVagas(), mestre: await repositorioMestre(), exportacoes: await repositorioExportacoes(), gerar: gerarPdf };
}

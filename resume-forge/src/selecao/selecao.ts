import { normalizarRequisitos, normalizarSelecao } from "./normalizar";
import { comErros, promptRequisitos, promptSelecao, SISTEMA } from "./prompts";
import { SCHEMA_REQUISITOS, SCHEMA_SELECAO } from "./schemas";
import { ErroIA, ErroSelecao } from "./tipos";
import type { ClienteIA, ItensMestre, Requisito, Selecao } from "./tipos";

export type OpcoesSelecao = {
  /** Novas tentativas depois da primeira, quando a saída da IA é inutilizável (padrão: 2). */
  novasTentativas?: number;
};

/** Chama a IA e normaliza; se a saída for inutilizável, devolve o erro ao modelo e tenta de novo. */
async function comRetentativa<T>(
  cliente: ClienteIA,
  schema: Record<string, unknown>,
  prompt: string,
  normalizar: (bruto: unknown) => { ok: true; valor: T } | { ok: false; erros: string[] },
  novasTentativas: number,
  oQue: string,
): Promise<T> {
  let erros: string[] = [];
  for (let tentativa = 0; tentativa <= novasTentativas; tentativa++) {
    const usuario = erros.length ? comErros(prompt, erros) : prompt;
    try {
      const resultado = normalizar(await cliente.completarJson({ sistema: SISTEMA, usuario, schema }));
      if (resultado.ok) return resultado.valor;
      erros = resultado.erros;
    } catch (e) {
      if (e instanceof ErroIA && e.tipo === "saida") erros = [e.message];
      else throw e; // erro de rede ou HTTP: repetir não ajuda
    }
  }
  throw new ErroSelecao(`Não foi possível ${oQue} depois de ${novasTentativas + 1} tentativas.`, erros);
}

export function extrairRequisitos(cliente: ClienteIA, vaga: string, opcoes: OpcoesSelecao = {}): Promise<Requisito[]> {
  return comRetentativa(
    cliente,
    SCHEMA_REQUISITOS,
    promptRequisitos(vaga),
    (bruto) => {
      const r = normalizarRequisitos(bruto);
      return r.ok ? { ok: true, valor: r.requisitos } : r;
    },
    opcoes.novasTentativas ?? 2,
    "extrair os requisitos da vaga",
  );
}

export type ResultadoSelecao = { selecao: Selecao; ajustes: string[] };

export function selecionar(
  cliente: ClienteIA,
  requisitos: Requisito[],
  itens: ItensMestre,
  opcoes: OpcoesSelecao = {},
): Promise<ResultadoSelecao> {
  return comRetentativa(
    cliente,
    SCHEMA_SELECAO,
    promptSelecao(requisitos, itens),
    (bruto) => {
      const r = normalizarSelecao(bruto, itens, requisitos);
      return r.ok ? { ok: true, valor: { selecao: r.selecao, ajustes: r.ajustes } } : r;
    },
    opcoes.novasTentativas ?? 2,
    "obter uma seleção válida",
  );
}

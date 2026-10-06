// Tipos do módulo de seleção. Sem dependência de framework nem de banco.

export type Item = { id: string; texto: string; tags?: string[]; sempreVisivel?: boolean };
export type Experiencia = {
  id: string;
  titulo: string; // "Empresa · Cargo · Datas"
  bullets: Item[];
  tags?: string[];
  sempreVisivel?: boolean;
};

/** Itens do mestre que a IA pode selecionar. Nunca inclui nome nem contato. */
export type ItensMestre = {
  resumos: Item[];
  experiencias: Experiencia[];
  projetos: Item[];
  skills: Item[];
};

export type Requisito = { id: string; texto: string };

export type SelecaoExperiencia = { id: string; bullets: string[] };

/** Seleção devolvida pela IA, já normalizada: só IDs existentes, sem duplicatas. */
export type Selecao = {
  resumo: string;
  experiencias: SelecaoExperiencia[];
  projetos: string[];
  skills: string[];
  /** item mostrado → requisitos que ele cobre */
  cobertura: Record<string, string[]>;
  /** requisitos que nenhum item mostrado cobre (sempre recalculado pelo código) */
  lacunas: string[];
};

export type ResultadoNormalizacao =
  | { ok: true; selecao: Selecao; ajustes: string[] }
  | { ok: false; erros: string[] };

/** Cliente de IA: devolve JSON já interpretado. Trocável por outro provedor. */
export interface ClienteIA {
  completarJson(pedido: PedidoJson): Promise<unknown>;
}
export type PedidoJson = {
  sistema: string;
  usuario: string;
  schema: Record<string, unknown>;
};

/** `saida`: a IA respondeu algo inutilizável (vazio, JSON inválido); vale tentar de novo.
 *  `servico`: erro de rede ou HTTP; repetir a mesma chamada não ajuda. */
export class ErroIA extends Error {
  constructor(
    message: string,
    readonly tipo: "saida" | "servico",
  ) {
    super(message);
    this.name = "ErroIA";
  }
}

export class ErroSelecao extends Error {
  constructor(
    message: string,
    readonly erros: string[],
  ) {
    super(message);
    this.name = "ErroSelecao";
  }
}

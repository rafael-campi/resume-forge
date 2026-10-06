import type { ItensMestre, Requisito } from "./tipos";

export const SISTEMA =
  "Você ajuda a adaptar um currículo a uma vaga. Responda SOMENTE com JSON válido no schema pedido. " +
  "Nunca invente itens nem IDs: use apenas os IDs fornecidos. Não reescreva texto.";

export const promptRequisitos = (vaga: string) =>
  `Extraia os requisitos da vaga abaixo, um por item, com id r1, r2, ... e o texto curto do requisito.\n\nVAGA:\n${vaga}`;

/** Itens "sempre visível" não vão para a IA: o código os insere depois. */
export function listarItens(itens: ItensMestre): string {
  const visiveis = <T extends { sempreVisivel?: boolean }>(xs: T[]) => xs.filter((x) => !x.sempreVisivel);
  return [
    "RESUMOS (escolha exatamente um id):",
    ...itens.resumos.map((r) => `- ${r.id}: ${r.texto}`),
    "EXPERIÊNCIAS E BULLETS:",
    ...visiveis(itens.experiencias).flatMap((e) => [
      `- ${e.id}: ${e.titulo}`,
      ...visiveis(e.bullets).map((b) => `    - ${b.id}: ${b.texto}${b.tags?.length ? ` [tags: ${b.tags.join(", ")}]` : ""}`),
    ]),
    "PROJETOS:",
    ...visiveis(itens.projetos).map((p) => `- ${p.id}: ${p.texto}`),
    "SKILLS:",
    ...visiveis(itens.skills).map((k) => `- ${k.id}: ${k.texto}`),
  ].join("\n");
}

export const promptSelecao = (requisitos: Requisito[], itens: ItensMestre) =>
  [
    "Dados os requisitos da vaga e os itens do currículo, escolha o que mostrar.",
    "- Ordene por relevância para a vaga (mais relevante primeiro), em cada lista.",
    "- Omitir um item significa ocultá-lo.",
    '- "cobertura": para cada item mostrado (resumo, experiência, bullet, projeto ou skill), liste os ids de requisitos que ele cobre.',
    '- "lacunas": ids de requisitos que nenhum item mostrado cobre.',
    "",
    "REQUISITOS:",
    ...requisitos.map((r) => `- ${r.id}: ${r.texto}`),
    "",
    listarItens(itens),
  ].join("\n");

export const comErros = (prompt: string, erros: string[]) =>
  `${prompt}\n\nA resposta anterior tinha problemas. Corrija e responda de novo:\n${erros.map((e) => `- ${e}`).join("\n")}`;

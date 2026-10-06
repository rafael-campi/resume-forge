import { SCHEMA_REQUISITOS } from "./schemas";
import type { ClienteIA, PedidoJson } from "./tipos";

// IA falsa e determinística: sem rede, sem custo, sem enviar nada a ninguém. Serve para testes e para usar o app offline
// (FORGE_IA=falsa). Não entende a vaga: casa palavras. A qualidade da seleção real é a da IA de verdade.

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const COMUNS = new Set(["com", "para", "por", "uma", "dos", "das", "nos", "nas", "que", "mais", "como", "the", "and", "for"]);
// pontos no meio ficam ("node.js"); nas pontas são pontuação ("PostgreSQL.")
const palavras = (s: string) =>
  new Set(semAcento(s).split(/[^a-z0-9+#.]+/).map((p) => p.replace(/^\.+|\.+$/g, "")).filter((p) => p.length >= 3 && !COMUNS.has(p)));

function requisitosDaVaga(usuario: string) {
  const vaga = usuario.split("VAGA:\n")[1] ?? usuario;
  const linhas = vaga.split("\n").map((l) => l.trim());
  const itens = linhas.filter((l) => /^[-•*]\s+/.test(l)).map((l) => l.replace(/^[-•*]\s+/, ""));
  const base = itens.length ? itens : linhas.filter((l) => l.length > 15).slice(0, 6);
  return { requisitos: base.map((texto, i) => ({ id: `r${i + 1}`, texto })) };
}

function selecao(usuario: string) {
  const [antes = "", itensTxt = ""] = usuario.split("RESUMOS (escolha exatamente um id):");
  const reqs = [...antes.matchAll(/^- (r\d+): (.+)$/gm)].map((m) => ({ id: m[1]!, palavras: palavras(m[2]!) }));
  const cobre = (texto: string) => reqs.filter((r) => [...palavras(texto)].some((p) => r.palavras.has(p))).map((r) => r.id);

  const cobertura: Record<string, string[]> = {};
  const marca = (id: string, texto: string) => {
    const c = cobre(texto);
    if (c.length) cobertura[id] = c;
    return c.length;
  };

  const secoes = itensTxt.split(/^(?:EXPERIÊNCIAS E BULLETS|PROJETOS|SKILLS):$/m);
  const linhas = (s = "") => s.split("\n").filter((l) => /^\s*- \S+: /.test(l));
  const parse = (l: string) => /^(\s*)- (\S+): (.*)$/.exec(l)!;

  const resumo = parse(linhas(secoes[0])[0] ?? "- s1: ")[2]!;
  const experiencias: { id: string; bullets: string[]; n: number }[] = [];
  for (const l of linhas(secoes[1])) {
    const [, recuo, id, texto] = parse(l);
    if (!recuo) experiencias.push({ id: id!, bullets: [], n: 0 });
    else if (marca(id!, texto!)) {
      const e = experiencias[experiencias.length - 1]!;
      e.bullets.push(id!);
      e.n++;
    }
  }
  const lista = (s?: string) => linhas(s).map(parse).filter((m) => marca(m[2]!, m[3]!)).map((m) => m[2]!);
  const escolhidas = experiencias.filter((e) => e.bullets.length).sort((a, b) => b.n - a.n);

  return {
    resumo,
    experiencias: escolhidas.map(({ id, bullets }) => ({ id, bullets })),
    projetos: lista(secoes[2]),
    skills: lista(secoes[3]),
    cobertura,
    lacunas: reqs.filter((r) => !Object.values(cobertura).some((c) => c.includes(r.id))).map((r) => r.id),
  };
}

/** `atrasoMs` simula a lentidão da IA real (a de verdade leva de 40 a 105 s por geração). */
export function criarClienteFalso(atrasoMs = 0): ClienteIA {
  return {
    async completarJson(pedido: PedidoJson) {
      if (atrasoMs) await new Promise((r) => setTimeout(r, atrasoMs));
      return pedido.schema === SCHEMA_REQUISITOS ? requisitosDaVaga(pedido.usuario) : selecao(pedido.usuario);
    },
  };
}

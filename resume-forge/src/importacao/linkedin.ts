// Interpreta as linhas do PDF do perfil do LinkedIn e monta itens do mestre. Sem IA: só regras sobre o texto,
// então nada sai da máquina e nada é inventado. O que vira bullet é a descrição que você mesmo escreveu no LinkedIn.
import type { MesAno, Mestre } from "../mestre/esquema";
import { novoId } from "../mestre/id";
import type { Linha } from "./pdf";

export type Importado = Partial<Pick<Mestre, "resumos" | "experiencias" | "formacao" | "skills" | "certificacoes" | "idiomas">> & {
  contato?: Partial<Mestre["contato"]>;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, jun: 6, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12,
};

export function parseData(bruto: string): MesAno | "atual" | null {
  const s = norm(bruto).replace(/[.,]/g, "");
  if (/^(present|atual|presente|o momento|atualmente)$/.test(s)) return "atual";
  const ano = /(?:^|\s)(\d{4})$/.exec(s);
  if (!ano || +ano[1]! < 1950 || +ano[1]! > 2100) return null;
  const resto = s.slice(0, ano.index).replace(/\bde\b/g, "").trim();
  if (!resto) return { mes: 1, ano: +ano[1]! };
  const mes = MESES[resto];
  return mes ? { mes, ano: +ano[1]! } : null;
}

/** "julho de 2024 - Present (2 anos 4 meses)" → { inicio, fim }. */
function parsePeriodo(texto: string): { inicio: MesAno; fim: MesAno | "atual" } | null {
  const m = /^(.+?)\s+[-–]\s+(.+?)\s*(?:\([^)]*\))?$/.exec(texto.trim());
  if (!m) return null;
  const inicio = parseData(m[1]!), fim = parseData(m[2]!);
  return inicio && inicio !== "atual" && fim ? { inicio, fim } : null;
}

const SECOES: Record<string, string> = {
  contato: "contato", contact: "contato",
  "principais competencias": "skills", "top skills": "skills", competencias: "skills",
  certifications: "certificacoes", certificacoes: "certificacoes", "licenses & certifications": "certificacoes", "licencas e certificados": "certificacoes",
  idiomas: "idiomas", languages: "idiomas",
  resumo: "resumo", summary: "resumo", sobre: "resumo", about: "resumo",
  experiencia: "experiencia", experience: "experiencia",
  "formacao academica": "formacao", education: "formacao",
};

const ehDuracao = (t: string) => /^\d+\s+(anos?|meses|mes|years?|yrs?|months?|mos?)\b/.test(norm(t));
const ehRodape = (t: string) => /^(page|pagina)\s+\d+\s+(of|de)\s+\d+$/.test(norm(t));

function secoes(linhas: Linha[], ehTitulo: (l: Linha) => boolean) {
  const out = new Map<string, Linha[]>([["", []]]);
  let atual = "";
  for (const l of linhas) {
    if (ehRodape(l.texto)) continue;
    const chave = SECOES[norm(l.texto)];
    if (chave && ehTitulo(l)) { atual = chave; out.set(atual, out.get(atual) ?? []); continue; }
    if (ehTitulo(l) && !chave) { atual = `outro:${norm(l.texto)}`; out.set(atual, []); continue; }
    out.get(atual)!.push(l);
  }
  return out;
}

// quebra de linha dentro de um parágrafo chega a 1,7x a altura da fonte; entre parágrafos passa de 3x
const PARAGRAFO = 2.2;

/** Junta linhas em itens: uma nova linha começa um item quando o espaço entre elas é maior que o de uma quebra de linha. */
function itens(linhas: Linha[], fator = 1.4): string[][] {
  const grupos: Linha[][] = [];
  for (const l of linhas) {
    const ant = grupos.at(-1)?.at(-1);
    if (ant && ant.pagina === l.pagina && ant.y - l.y <= l.h * fator) grupos.at(-1)!.push(l);
    else grupos.push([l]);
  }
  return grupos.map((g) => g.map((l) => l.texto));
}

const juntar = (ls: string[]) => ls.join(" ");

function contato(lateral: Linha[], cabecalho: Linha[]): NonNullable<Importado["contato"]> {
  const c: NonNullable<Importado["contato"]> = {};
  if (cabecalho[0]) c.nome = cabecalho[0].texto;
  const resto = cabecalho.slice(1);
  if (resto.length >= 2) c.cidade = resto.at(-1)!.texto;
  else if (resto.length === 1 && resto[0]!.texto.includes(",")) c.cidade = resto[0]!.texto;
  // URLs quebradas em duas linhas terminam em "-": juntam sem espaço
  const bloco = lateral.map((l) => l.texto).reduce((a, t) => (!a ? t : a.endsWith("-") ? a + t : `${a} ${t}`), "");
  const email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(bloco);
  if (email) c.email = email[0];
  const telefone = /(\+?\d[\d\s().-]{7,}\d)\s*\((?:Mobile|Home|Work|Celular|Casa|Trabalho)\)/i.exec(bloco);
  if (telefone) c.telefone = telefone[1]!.trim();
  for (const m of bloco.matchAll(/(\S+)\s*\(([^)]+)\)/g)) {
    const [, url, rotulo] = m as unknown as [string, string, string];
    if (/linkedin/i.test(rotulo)) c.linkedin = url;
    else if (/github\.com/i.test(url)) c.github = url;
    else if (/^(portfolio|portf[óo]lio|blog|website|personal website|company website|other|site)/i.test(rotulo) && !c.site) c.site = url;
  }
  return c;
}

function experiencias(linhas: Linha[]): Mestre["experiencias"] {
  const datas = linhas.flatMap((l, i) => (parsePeriodo(l.texto) ? [i] : []));
  // onde começa o cabeçalho (empresa, duração do grupo, cargo) de cada período
  const cabecalhos = datas.map((i) => {
    const cargo = linhas[i - 1];
    if (!cargo) return { inicio: i, empresa: null as string | null };
    let ini = i - 1;
    let empresa: string | null = null;
    const ant = linhas[i - 2];
    if (ant && ant.pagina === cargo.pagina && ant.h > cargo.h + 0.2 && !ehDuracao(ant.texto)) { empresa = ant.texto; ini = i - 2; }
    else if (ant && ehDuracao(ant.texto) && linhas[i - 3] && linhas[i - 3]!.h > cargo.h + 0.2) { empresa = linhas[i - 3]!.texto; ini = i - 3; }
    return { inicio: ini, empresa };
  });

  let empresaAtual = "";
  return datas.map((i, k) => {
    const periodo = parsePeriodo(linhas[i]!.texto)!;
    empresaAtual = cabecalhos[k]!.empresa ?? empresaAtual;
    const fimBloco = cabecalhos[k + 1]?.inicio ?? linhas.length;
    let corpo = linhas.slice(i + 1, fimBloco);
    // a primeira linha colada na data, sem espaço de parágrafo, é o local
    const d = linhas[i]!;
    if (corpo[0] && corpo[0].pagina === d.pagina && d.y - corpo[0].y <= corpo[0].h * 1.6 && !/^[•\-–*]/.test(corpo[0].texto)) corpo = corpo.slice(1);
    const bullets = itens(corpo, PARAGRAFO).map((g) => ({ id: novoId("b"), texto: juntar(g).replace(/^[•\-–*]\s*/, "").trim(), tags: [], sempreVisivel: false })).filter((b) => b.texto);
    return {
      id: novoId("e"), empresa: empresaAtual, cargo: linhas[i - 1]?.texto ?? "", inicio: periodo.inicio, fim: periodo.fim,
      bullets, tags: [], sempreVisivel: false,
    };
  });
}

function formacoes(linhas: Linha[]): Mestre["formacao"] {
  const entradas: Linha[][] = [];
  for (const l of linhas) {
    const ant = entradas.at(-1)?.at(-1);
    if (!ant || l.h > ant.h + 0.4) entradas.push([l]);
    else entradas.at(-1)!.push(l);
  }
  return entradas.map((e) => {
    let resto = juntar(e.slice(1).map((l) => l.texto));
    let inicio: MesAno | null = null, fim: MesAno | "atual" | null = null;
    const datas = /\(([^()]*\d{4}[^()]*)\)\s*$/.exec(resto);
    if (datas) {
      resto = resto.slice(0, datas.index);
      const partes = datas[1]!.split(/\s+[-–]\s+/);
      const a = parseData(partes[0]!), b = partes[1] ? parseData(partes[1]) : null;
      inicio = a && a !== "atual" ? a : null;
      fim = b ?? null;
    }
    return { id: novoId("f"), instituicao: e[0]!.texto, curso: resto.replace(/[\s·]+$/, "").trim(), inicio, fim };
  });
}

export function interpretarLinkedin(linhas: Linha[]): Importado {
  const lateral = secoes(linhas.filter((l) => l.coluna === "lateral"), (l) => l.h >= 12.5);
  const principal = secoes(linhas.filter((l) => l.coluna === "principal"), (l) => l.h >= 14 && l.h <= 20);
  const out: Importado = {};
  // sem nenhum título de seção do LinkedIn não é um perfil: não devolve nem o "nome"
  const reconhecidas = [...lateral.keys(), ...principal.keys()].filter((k) => k && !k.startsWith("outro:"));
  if (!reconhecidas.length) return out;

  const c = contato(lateral.get("contato") ?? [], principal.get("") ?? []);
  if (Object.keys(c).length) out.contato = c;

  const resumo = principal.get("resumo");
  if (resumo?.length) {
    const texto = itens(resumo, PARAGRAFO).map(juntar).join("\n\n");
    out.resumos = [{ id: novoId("s"), texto }];
  }

  const exp = principal.get("experiencia");
  if (exp?.length) out.experiencias = experiencias(exp);

  const form = principal.get("formacao");
  if (form?.length) out.formacao = formacoes(form);

  const skills = lateral.get("skills");
  if (skills?.length) out.skills = itens(skills).map((g) => ({ id: novoId("k"), nome: juntar(g), categoria: "", tags: [], sempreVisivel: false }));

  const certs = lateral.get("certificacoes");
  if (certs?.length) out.certificacoes = itens(certs).map((g) => ({ id: novoId("c"), nome: juntar(g), emissor: "", ano: null, sempreVisivel: false }));

  const idiomas = lateral.get("idiomas");
  if (idiomas?.length) {
    out.idiomas = itens(idiomas).map((g) => {
      const t = juntar(g);
      const m = /^(.+?)\s*\((.+)\)$/.exec(t);
      return { id: novoId("i"), idioma: m ? m[1]! : t, nivel: m ? m[2]! : "" };
    });
  }
  return out;
}

// Junta o que veio do LinkedIn ao mestre sem nunca apagar nem sobrescrever o que você já escreveu:
// itens que já existem (mesma chave) são pulados e só campos vazios do contato são preenchidos.
import type { Mestre, Secao } from "../mestre/esquema";
import type { Importado } from "./linkedin";

const chave = (...p: (string | number | null | undefined)[]) =>
  p.map((x) => String(x ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim()).join("|");
const mes = (d: { mes: number; ano: number } | "atual" | null) => (d && d !== "atual" ? `${d.ano}-${d.mes}` : d);

export type Mesclagem = {
  /** Só as seções que mudaram, já com o conteúdo final (existente + novo). */
  secoes: Partial<{ [S in Secao]: Mestre[S] }>;
  /** Quantos itens novos entram e quantos já existiam, por seção. */
  resumo: Partial<Record<Secao, { novos: number; existentes: number }>>;
};

export function mesclar(atual: Mestre, importado: Importado): Mesclagem {
  const secoes: Mesclagem["secoes"] = {};
  const resumo: Mesclagem["resumo"] = {};

  if (importado.contato) {
    const novo = { ...atual.contato };
    let preenchidos = 0, existentes = 0;
    for (const [k, v] of Object.entries(importado.contato) as [keyof Mestre["contato"], string][]) {
      if (!v) continue;
      if (atual.contato[k].trim()) existentes++;
      else { novo[k] = v; preenchidos++; }
    }
    resumo.contato = { novos: preenchidos, existentes };
    if (preenchidos) secoes.contato = novo;
  }

  function lista<S extends Exclude<Secao, "contato">>(secao: S, chaveDe: (i: Mestre[S][number]) => string) {
    const novos = importado[secao as keyof Importado] as Mestre[S] | undefined;
    if (!novos) return;
    const vistas = new Set((atual[secao] as Mestre[S]).map(chaveDe));
    const entram = (novos as Mestre[S]).filter((i) => {
      const c = chaveDe(i);
      if (vistas.has(c)) return false;
      vistas.add(c);
      return true;
    });
    resumo[secao] = { novos: entram.length, existentes: novos.length - entram.length };
    if (entram.length) (secoes as any)[secao] = [...(atual[secao] as Mestre[S]), ...entram];
  }

  lista("resumos", (r) => chave(r.texto));
  lista("experiencias", (e) => chave(e.empresa, e.cargo, mes(e.inicio)));
  lista("formacao", (f) => chave(f.instituicao, f.curso));
  lista("skills", (s) => chave(s.nome));
  lista("certificacoes", (c) => chave(c.nome));
  lista("idiomas", (i) => chave(i.idioma));
  return { secoes, resumo };
}

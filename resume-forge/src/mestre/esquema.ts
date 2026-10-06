// Currículo mestre: a fonte da verdade com todas as experiências, projetos e skills.
// O esquema aceita rascunhos (campos em branco): salvar nunca exige a seção completa.
// O que falta para a seção estar completa é calculado em completude.ts.
import { z } from "zod";

const texto = z.string().default("");
const tags = z.array(z.string()).default([]);
const id = z.string().min(1);
const sempreVisivel = z.boolean().default(false);

const mesAno = z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(1950).max(2100) });
const inicio = mesAno.nullable().default(null);
const fim = z.union([mesAno, z.literal("atual")]).nullable().default(null);

export const contato = z.object({
  nome: texto, email: texto, telefone: texto, cidade: texto, linkedin: texto, github: texto, site: texto,
});

export const bullet = z.object({ id, texto, tags, sempreVisivel });
export const experiencia = z.object({
  id, empresa: texto, cargo: texto, inicio, fim, bullets: z.array(bullet).default([]), tags, sempreVisivel,
});
export const resumo = z.object({ id, texto });
export const projeto = z.object({ id, nome: texto, descricao: texto, link: texto, tags, sempreVisivel });
export const formacao = z.object({ id, instituicao: texto, curso: texto, inicio, fim });
export const skill = z.object({ id, nome: texto, categoria: texto, tags, sempreVisivel });
export const certificacao = z.object({ id, nome: texto, emissor: texto, ano: z.number().int().nullable().default(null), sempreVisivel });
export const idioma = z.object({ id, idioma: texto, nivel: texto });

export const SECOES = ["contato", "resumos", "experiencias", "projetos", "formacao", "skills", "certificacoes", "idiomas"] as const;
export type Secao = (typeof SECOES)[number];

export const ESQUEMA_SECAO = {
  contato: contato.prefault({}),
  resumos: z.array(resumo).default([]),
  experiencias: z.array(experiencia).default([]),
  projetos: z.array(projeto).default([]),
  formacao: z.array(formacao).default([]),
  skills: z.array(skill).default([]),
  certificacoes: z.array(certificacao).default([]),
  idiomas: z.array(idioma).default([]),
} as const;

export const esquemaMestre = z.object(ESQUEMA_SECAO);

export type Mestre = z.output<typeof esquemaMestre>;
export type MesAno = z.output<typeof mesAno>;
export type Experiencia = z.output<typeof experiencia>;
export type Bullet = z.output<typeof bullet>;
export type DadosSecao<S extends Secao> = z.output<(typeof ESQUEMA_SECAO)[S]>;

export const mestreVazio = (): Mestre => esquemaMestre.parse({});

export { novoId } from "./id";

/** IDs repetidos dentro de um valor (um ID precisa identificar um único item). */
export function idsRepetidos(valor: unknown): string[] {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();
  const percorrer = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(percorrer);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.id === "string") (vistos.has(o.id) ? repetidos : vistos).add(o.id);
      Object.values(o).forEach(percorrer);
    }
  };
  percorrer(valor);
  return [...repetidos];
}

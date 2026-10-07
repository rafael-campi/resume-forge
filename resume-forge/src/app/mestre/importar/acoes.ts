"use server";

import { revalidatePath } from "next/cache";
import { interpretarLinkedin } from "../../../importacao/linkedin";
import type { Importado } from "../../../importacao/linkedin";
import { mesclar } from "../../../importacao/mesclar";
import type { Mesclagem } from "../../../importacao/mesclar";
import { linhasDoPdf } from "../../../importacao/pdf";
import { SECOES } from "../../../mestre/esquema";
import { repositorioMestre } from "../../../mestre/pool";

export type Previa = { importado: Importado; mesclagem: Mesclagem["resumo"]; itens: Record<string, string[]> };
export type ResultadoAnalise = { ok: true; previa: Previa } | { ok: false; erro: string };
export type ResultadoImportar = { ok: true; secoes: string[] } | { ok: false; erro: string };

const TAMANHO_MAXIMO = 5 * 1024 * 1024;

function legendas(i: Importado): Record<string, string[]> {
  return {
    contato: Object.entries(i.contato ?? {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    resumos: (i.resumos ?? []).map((r) => r.texto.slice(0, 120) + (r.texto.length > 120 ? "…" : "")),
    experiencias: (i.experiencias ?? []).map((e) => `${e.cargo} — ${e.empresa} (${e.bullets.length} bullet${e.bullets.length === 1 ? "" : "s"})`),
    formacao: (i.formacao ?? []).map((f) => `${f.curso} — ${f.instituicao}`),
    skills: (i.skills ?? []).map((s) => s.nome),
    certificacoes: (i.certificacoes ?? []).map((c) => c.nome),
    idiomas: (i.idiomas ?? []).map((l) => (l.nivel ? `${l.idioma} (${l.nivel})` : l.idioma)),
  };
}

export async function analisarPerfil(formData: FormData): Promise<ResultadoAnalise> {
  const arquivo = formData.get("pdf");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Escolha o PDF do perfil." };
  if (arquivo.size > TAMANHO_MAXIMO) return { ok: false, erro: "O arquivo passa de 5 MB; não parece um perfil do LinkedIn." };
  try {
    const dados = new Uint8Array(await arquivo.arrayBuffer());
    if (new TextDecoder().decode(dados.slice(0, 5)) !== "%PDF-") return { ok: false, erro: "Esse arquivo não é um PDF." };
    const importado = interpretarLinkedin(await linhasDoPdf(dados));
    if (!Object.keys(importado).length) return { ok: false, erro: "Não encontrei seções de perfil nesse PDF. Use o PDF do LinkedIn (Perfil → Mais → Salvar como PDF)." };
    const { resumo } = mesclar(await (await repositorioMestre()).ler(), importado);
    return { ok: true, previa: { importado, mesclagem: resumo, itens: legendas(importado) } };
  } catch (erro) {
    console.error("Falha ao ler o PDF do LinkedIn:", erro);
    return { ok: false, erro: "Não consegui ler esse PDF." };
  }
}


export async function importarPerfil(importado: Importado): Promise<ResultadoImportar> {
  try {
    const repo = await repositorioMestre();
    const { secoes } = mesclar(await repo.ler(), importado);
    const gravadas: string[] = [];
    for (const s of SECOES) {
      if (!(s in secoes)) continue;
      const r = await repo.salvarSecao(s, secoes[s]);
      if (!r.ok) return { ok: false, erro: `${s}: ${r.erros.join("; ")}` };
      gravadas.push(s);
    }
    revalidatePath("/mestre", "layout");
    return { ok: true, secoes: gravadas };
  } catch (erro) {
    console.error("Falha ao importar o perfil:", erro);
    return { ok: false, erro: "não consegui falar com o banco de dados" };
  }
}

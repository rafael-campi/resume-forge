import type { Mestre, MesAno, Secao } from "./esquema";

export type Completude = { obrigatoria: boolean; completa: boolean; pendencias: string[] };

const vazio = (s: string) => s.trim() === "";
export const formatarMesAno = (d: MesAno) => `${String(d.mes).padStart(2, "0")}/${d.ano}`;

/** O que falta em cada seção. Seções opcionais só acusam itens começados e deixados em branco. */
export function completude(m: Mestre): Record<Secao, Completude> {
  const secao = (obrigatoria: boolean, pendencias: string[]): Completude => ({
    obrigatoria, completa: pendencias.length === 0, pendencias,
  });

  const contato: string[] = [];
  const c = m.contato;
  if (vazio(c.nome)) contato.push("Falta o nome.");
  if (vazio(c.email)) contato.push("Falta o e-mail.");
  if (vazio(c.telefone)) contato.push("Falta o telefone.");
  if (vazio(c.cidade)) contato.push("Falta a cidade.");

  const resumos: string[] = [];
  if (m.resumos.length === 0) resumos.push("Escreva ao menos uma versão do resumo.");
  else if (m.resumos.some((r) => vazio(r.texto))) resumos.push("Há versões do resumo em branco.");

  const experiencias: string[] = [];
  if (m.experiencias.length === 0) experiencias.push("Adicione ao menos uma experiência.");
  m.experiencias.forEach((e, i) => {
    const nome = vazio(e.empresa) ? `Experiência ${i + 1}` : e.empresa;
    if (vazio(e.empresa) || vazio(e.cargo)) experiencias.push(`${nome}: falta empresa ou cargo.`);
    if (!e.inicio || !e.fim) experiencias.push(`${nome}: faltam as datas (use "atual" para o emprego em andamento).`);
    if (!e.bullets.some((b) => !vazio(b.texto))) experiencias.push(`${nome}: escreva ao menos um bullet.`);
  });

  const formacao: string[] = [];
  if (m.formacao.length === 0) formacao.push("Adicione ao menos uma formação.");
  else if (m.formacao.some((f) => vazio(f.instituicao) || vazio(f.curso))) formacao.push("Há formações sem instituição ou curso.");

  const skills: string[] = [];
  if (m.skills.length === 0) skills.push("Adicione ao menos uma skill.");
  else if (m.skills.some((s) => vazio(s.nome))) skills.push("Há skills em branco.");

  const emBranco = (rotulo: string, itens: boolean) => (itens ? [`Há ${rotulo} em branco.`] : []);

  return {
    contato: secao(true, contato),
    resumos: secao(true, resumos),
    experiencias: secao(true, experiencias),
    formacao: secao(true, formacao),
    skills: secao(true, skills),
    projetos: secao(false, emBranco("projetos", m.projetos.some((p) => vazio(p.nome)))),
    certificacoes: secao(false, emBranco("certificações", m.certificacoes.some((x) => vazio(x.nome)))),
    idiomas: secao(false, emBranco("idiomas", m.idiomas.some((i) => vazio(i.idioma)))),
  };
}

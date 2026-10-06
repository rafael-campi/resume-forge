import type { CurriculoFinal } from "./montar";

// A folha do currículo como HTML. É a ÚNICA fonte do markup: a pré-visualização da Revisão injeta este HTML
// e o Chromium imprime este HTML no PDF, então os dois são iguais por construção. Função pura, sem React:
// roda no servidor, no navegador e nos testes. Todo texto que entra no HTML é escapado.

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ESCAPES[c]!);

/** Link clicável sem depender de o texto vir com "https://". */
const href = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const link = (url: string, texto = url) => `<a href="${esc(href(url))}">${esc(texto)}</a>`;

const secao = (titulo: string, corpo: string) => `<section><h2>${esc(titulo)}</h2>${corpo}</section>`;
const linhaCargo = (esquerda: string, datas: string) => `<div class="linha-cargo"><span>${esquerda}</span><span class="datas">${esc(datas)}</span></div>`;

export function folhaHtml(c: CurriculoFinal): string {
  const ct = c.contato;
  const partes = [
    ct.cidade && esc(ct.cidade),
    ct.email && `<a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a>`,
    ct.telefone && esc(ct.telefone),
    ct.linkedin && link(ct.linkedin),
    ct.github && link(ct.github),
    ct.site && link(ct.site),
  ].filter(Boolean);

  const blocos = [
    c.resumo && secao("Resumo", `<p>${esc(c.resumo)}</p>`),
    c.skills.length > 0 && secao("Skills", c.skills.map((l) => `<p><strong>${esc(l.categoria)}:</strong> ${esc(l.nomes.join(", "))}</p>`).join("")),
    c.experiencias.length > 0 && secao("Experiência", c.experiencias.map((e) =>
      `<div>${linhaCargo(`<strong>${esc(e.empresa)}</strong>${e.cargo ? ` · ${esc(e.cargo)}` : ""}`, e.periodo)}${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div>`).join("")),
    c.projetos.length > 0 && secao("Projetos", c.projetos.map((p) =>
      `<p><strong>${esc(p.nome)}</strong>${p.link ? ` (${link(p.link)})` : ""}${p.descricao ? `: ${esc(p.descricao)}` : ""}</p>`).join("")),
    c.formacao.length > 0 && secao("Formação", c.formacao.map((f) =>
      linhaCargo(`<strong>${esc(f.instituicao)}</strong>${f.curso ? ` · ${esc(f.curso)}` : ""}`, f.periodo)).join("")),
    c.idiomas.length > 0 && secao("Idiomas", `<p>${esc(c.idiomas.map((i) => (i.nivel ? `${i.idioma} (${i.nivel})` : i.idioma)).join(", "))}</p>`),
  ].filter(Boolean);

  const nome = ct.nome ? esc(ct.nome) : '<span class="vazio-folha">Seu nome</span>';
  return `<article class="folha"><div class="folha-conteudo"><header><h1 class="nome">${nome}</h1><p class="contato">${partes.join(" · ")}</p></header>${blocos.join("")}</div></article>`;
}

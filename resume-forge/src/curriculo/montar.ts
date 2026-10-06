import { formatarMesAno } from "../mestre/completude";
import type { Mestre, MesAno } from "../mestre/esquema";
import { idsVisiveis } from "../revisao/estado";
import type { EstadoRevisao } from "../revisao/estado";

/** O currículo pronto para mostrar: só o que está visível, na ordem final. Não depende de React nem de banco. */
export type CurriculoFinal = {
  contato: Mestre["contato"];
  resumo: string;
  /** Uma linha por categoria, na ordem de escolha; sem categoria vão em "Outras", no fim. */
  skills: { categoria: string; nomes: string[] }[];
  experiencias: { empresa: string; cargo: string; periodo: string; bullets: string[] }[];
  projetos: { nome: string; descricao: string; link: string }[];
  formacao: { instituicao: string; curso: string; periodo: string }[];
  idiomas: { idioma: string; nivel: string }[];
};

export function periodo(inicio: MesAno | null, fim: MesAno | "atual" | null): string {
  if (!inicio) return "";
  return `${formatarMesAno(inicio)} – ${fim === "atual" ? "atual" : fim ? formatarMesAno(fim) : ""}`.trim();
}

const OUTRAS = "Outras";

export function montarCurriculo(m: Mestre, e: EstadoRevisao): CurriculoFinal {
  const por = <T extends { id: string }>(itens: T[]) => new Map(itens.map((i) => [i.id, i]));
  const exps = por(m.experiencias);
  const projetos = por(m.projetos);
  const skills = por(m.skills);

  const categorias = new Map<string, string[]>();
  for (const id of idsVisiveis(e.skills)) {
    const s = skills.get(id);
    if (!s || !s.nome.trim()) continue;
    const cat = s.categoria.trim() || OUTRAS;
    categorias.set(cat, [...(categorias.get(cat) ?? []), s.nome.trim()]);
  }
  const linhas = [...categorias].map(([categoria, nomes]) => ({ categoria, nomes }));

  return {
    contato: m.contato,
    resumo: m.resumos.find((r) => r.id === e.resumo)?.texto ?? "",
    skills: [...linhas.filter((l) => l.categoria !== OUTRAS), ...linhas.filter((l) => l.categoria === OUTRAS)],
    experiencias: e.experiencias
      .filter((x) => x.visivel)
      .flatMap((x) => {
        const exp = exps.get(x.id);
        if (!exp) return [];
        const bullets = idsVisiveis(x.bullets).map((id) => exp.bullets.find((b) => b.id === id)?.texto ?? "").filter((t) => t.trim());
        return [{ empresa: exp.empresa, cargo: exp.cargo, periodo: periodo(exp.inicio, exp.fim), bullets }];
      }),
    projetos: idsVisiveis(e.projetos).flatMap((id) => {
      const p = projetos.get(id);
      return p && p.nome.trim() ? [{ nome: p.nome, descricao: p.descricao, link: p.link }] : [];
    }),
    // formação e idiomas são sempre visíveis, na ordem do mestre
    formacao: m.formacao.filter((f) => f.instituicao.trim() || f.curso.trim()).map((f) => ({ instituicao: f.instituicao, curso: f.curso, periodo: periodo(f.inicio, f.fim) })),
    idiomas: m.idiomas.filter((i) => i.idioma.trim()).map((i) => ({ idioma: i.idioma, nivel: i.nivel })),
  };
}

import type { Mestre } from "../mestre/esquema";
import { coberturaAtual } from "../revisao/estado";
import type { EstadoRevisao } from "../revisao/estado";
import type { Requisito, Selecao } from "../selecao/tipos";

export type ResumoExportacao = {
  requisitos: { total: number; cobertos: number };
  lacunas: Requisito[];
  /** Itens do mestre que ficaram de fora do PDF, por seção. */
  ocultos: { secao: string; texto: string }[];
  /** O que falta no contato (vai no cabeçalho do PDF). */
  contatoIncompleto: string[];
};

const vazio = (s: string) => s.trim() === "";

/** O que a pessoa precisa ver antes de exportar: lacunas, o que ficou de fora e se falta contato. */
export function resumirExportacao(m: Mestre, e: EstadoRevisao, requisitos: Requisito[], coberturaIA: Selecao["cobertura"]): ResumoExportacao {
  const cob = coberturaAtual(e, requisitos, coberturaIA);
  const lacunas = cob.filter((c) => c.itens === 0).map((c) => c.requisito);

  const ocultos: ResumoExportacao["ocultos"] = [];
  for (const x of e.experiencias) {
    const exp = m.experiencias.find((y) => y.id === x.id);
    if (!exp) continue;
    const nome = [exp.empresa, exp.cargo].filter(Boolean).join(", ");
    if (!x.visivel) {
      ocultos.push({ secao: "Experiência", texto: nome });
      continue;
    }
    for (const b of x.bullets.filter((i) => !i.visivel)) {
      const t = exp.bullets.find((y) => y.id === b.id)?.texto;
      if (t && !vazio(t)) ocultos.push({ secao: `Experiência (${nome})`, texto: t });
    }
  }
  for (const p of e.projetos.filter((i) => !i.visivel)) {
    const t = m.projetos.find((y) => y.id === p.id)?.nome;
    if (t && !vazio(t)) ocultos.push({ secao: "Projetos", texto: t });
  }
  for (const s of e.skills.filter((i) => !i.visivel)) {
    const t = m.skills.find((y) => y.id === s.id)?.nome;
    if (t && !vazio(t)) ocultos.push({ secao: "Skills", texto: t });
  }

  const c = m.contato;
  const contatoIncompleto = [vazio(c.nome) && "nome", vazio(c.email) && "e-mail", vazio(c.telefone) && "telefone", vazio(c.cidade) && "cidade"].filter(Boolean) as string[];

  return { requisitos: { total: cob.length, cobertos: cob.length - lacunas.length }, lacunas, ocultos, contatoIncompleto };
}

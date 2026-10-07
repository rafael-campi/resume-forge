import { describe, expect, it } from "vitest";
import { esquemaMestre, mestreVazio } from "../mestre/esquema";
import { interpretarLinkedin, parseData } from "./linkedin";
import { mesclar } from "./mesclar";
import type { Linha } from "./pdf";

// Perfil fictício, com a mesma forma do PDF do LinkedIn: coluna lateral, coluna principal,
// empresa com vários cargos, cargo sem empresa na linha de cima e texto quebrado em várias linhas.
function perfil(): Linha[] {
  let y = 740;
  const l = (coluna: Linha["coluna"], texto: string, h: number, folga = 15, pagina = 1): Linha => ({ texto, coluna, pagina, y: (y -= folga), h });
  const lateral = (() => {
    y = 760;
    return [
      l("lateral", "Contato", 13), l("lateral", "ana@example.com", 10.5, 20),
      l("lateral", "www.linkedin.com/in/ana-", 11, 24), l("lateral", "silva-123 (LinkedIn)", 11, 15), l("lateral", "github.com/anasilva (Portfolio)", 11, 15),
      l("lateral", "Principais competências", 13, 35), l("lateral", "Python", 10.5, 20), l("lateral", "Machine", 10.5, 18), l("lateral", "Learning", 10.5, 12),
      l("lateral", "Languages", 13, 35), l("lateral", "Inglês (Professional Working)", 10.5, 20),
      l("lateral", "Certifications", 13, 35), l("lateral", "Curso de Docker em", 10.5, 20), l("lateral", "5 horas", 10.5, 12),
    ];
  })();
  const principal = (() => {
    y = 760;
    return [
      l("principal", "Ana Silva", 26), l("principal", "Engenheira de Software", 12, 20), l("principal", "São Paulo, Brasil", 12, 15),
      l("principal", "Resumo", 15.75, 35),
      l("principal", "Engenheira com foco em dados e", 12, 25), l("principal", "plataformas.", 12, 18),
      l("principal", "Gosto de ensinar.", 12, 36),
      l("principal", "Experiência", 15.75, 45),
      l("principal", "Acme Corp", 12, 30), l("principal", "Engenheira de dados", 11.5, 16), l("principal", "março de 2022 - Present (3 anos 1 mês)", 10.5, 14),
      l("principal", "São Paulo, Brasil", 10.5, 15), l("principal", "Construí o pipeline de eventos.", 10.5, 21),
      l("principal", "Beta Labs", 12, 40), l("principal", "2 anos 6 meses", 10.5, 16),
      l("principal", "Engenheira sênior", 11.5, 30), l("principal", "janeiro de 2021 - fevereiro de 2022 (1 ano 2 meses)", 10.5, 15),
      l("principal", "Reduzi o custo da nuvem em 30%.", 10.5, 36),
      l("principal", "Analista", 11.5, 40), l("principal", "julho de 2019 - dezembro de 2020 (1 ano 6 meses)", 10.5, 15),
      l("principal", "Formação acadêmica", 15.75, 45),
      l("principal", "USP", 12, 30), l("principal", "Ciência da Computação, Computação -", 10.5, 18), l("principal", "Geral · (2015 - 2019)", 10.5, 12),
    ];
  })();
  return [...lateral, ...principal];
}

describe("parseData", () => {
  it("entende meses em português e inglês, ano sozinho e o emprego atual", () => {
    expect(parseData("julho de 2024")).toEqual({ mes: 7, ano: 2024 });
    expect(parseData("Mar 2021")).toEqual({ mes: 3, ano: 2021 });
    expect(parseData("2019")).toEqual({ mes: 1, ano: 2019 });
    expect(parseData("Present")).toBe("atual");
    expect(parseData("abc")).toBeNull();
  });
});

describe("interpretarLinkedin", () => {
  const r = interpretarLinkedin(perfil());

  it("lê o contato, juntando a URL quebrada em duas linhas", () => {
    expect(r.contato).toEqual({
      nome: "Ana Silva", cidade: "São Paulo, Brasil", email: "ana@example.com",
      linkedin: "www.linkedin.com/in/ana-silva-123", github: "github.com/anasilva",
    });
  });

  it("junta o resumo em parágrafos", () => {
    expect(r.resumos).toHaveLength(1);
    expect(r.resumos![0]!.texto).toBe("Engenheira com foco em dados e plataformas.\n\nGosto de ensinar.");
  });

  it("lê empresa com vários cargos e cargo com a empresa logo acima", () => {
    expect(r.experiencias!.map((e) => [e.empresa, e.cargo, e.inicio, e.fim])).toEqual([
      ["Acme Corp", "Engenheira de dados", { mes: 3, ano: 2022 }, "atual"],
      ["Beta Labs", "Engenheira sênior", { mes: 1, ano: 2021 }, { mes: 2, ano: 2022 }],
      ["Beta Labs", "Analista", { mes: 7, ano: 2019 }, { mes: 12, ano: 2020 }],
    ]);
  });

  it("descarta o local e transforma a descrição em bullets", () => {
    expect(r.experiencias![0]!.bullets.map((b) => b.texto)).toEqual(["Construí o pipeline de eventos."]);
    expect(r.experiencias![1]!.bullets.map((b) => b.texto)).toEqual(["Reduzi o custo da nuvem em 30%."]);
    expect(r.experiencias![2]!.bullets).toEqual([]);
  });

  it("lê formação, skills, certificações e idiomas", () => {
    expect(r.formacao).toMatchObject([{ instituicao: "USP", curso: "Ciência da Computação, Computação - Geral", inicio: { mes: 1, ano: 2015 }, fim: { mes: 1, ano: 2019 } }]);
    expect(r.skills!.map((s) => s.nome)).toEqual(["Python", "Machine Learning"]);
    expect(r.certificacoes!.map((c) => c.nome)).toEqual(["Curso de Docker em 5 horas"]);
    expect(r.idiomas).toMatchObject([{ idioma: "Inglês", nivel: "Professional Working" }]);
  });

  it("produz itens que o esquema do mestre aceita, com IDs únicos", () => {
    const m = esquemaMestre.parse({ ...mestreVazio(), ...r, contato: { ...mestreVazio().contato, ...r.contato } });
    const ids = [...m.experiencias.flatMap((e) => [e.id, ...e.bullets.map((b) => b.id)]), ...m.skills.map((s) => s.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("devolve vazio para um PDF que não é perfil", () => {
    expect(interpretarLinkedin([{ texto: "Fatura 123", coluna: "principal", pagina: 1, y: 700, h: 10 }])).toEqual({});
  });
});

describe("mesclar", () => {
  const importado = interpretarLinkedin(perfil());

  it("num mestre vazio, tudo entra", () => {
    const { secoes, resumo } = mesclar(mestreVazio(), importado);
    expect(Object.keys(secoes).sort()).toEqual(["certificacoes", "contato", "experiencias", "formacao", "idiomas", "resumos", "skills"]);
    expect(resumo.experiencias).toEqual({ novos: 3, existentes: 0 });
  });

  it("não duplica nem sobrescreve o que já existe", () => {
    const atual = esquemaMestre.parse({
      contato: { nome: "Ana S.", email: "", telefone: "11 99999-0000" },
      experiencias: [{ id: "e1", empresa: "ACME corp", cargo: "Engenheira de Dados", inicio: { mes: 3, ano: 2022 }, fim: "atual", bullets: [{ id: "b1", texto: "Meu texto" }] }],
      skills: [{ id: "k1", nome: "python" }],
    });
    const { secoes, resumo } = mesclar(atual, importado);
    expect(secoes.contato).toMatchObject({ nome: "Ana S.", email: "ana@example.com", telefone: "11 99999-0000" });
    expect(secoes.experiencias!.map((e) => e.empresa)).toEqual(["ACME corp", "Beta Labs", "Beta Labs"]);
    expect(secoes.experiencias![0]!.bullets[0]!.texto).toBe("Meu texto");
    expect(secoes.skills!.map((s) => s.nome)).toEqual(["python", "Machine Learning"]);
    expect(resumo.experiencias).toEqual({ novos: 2, existentes: 1 });
  });

  it("importar duas vezes não muda nada", () => {
    const um = mesclar(mestreVazio(), importado).secoes;
    const atual = esquemaMestre.parse({ ...mestreVazio(), ...um });
    expect(mesclar(atual, importado).secoes).toEqual({});
  });
});

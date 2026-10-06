import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrar } from "../db/migrar";
import { esquemaMestre } from "../mestre/esquema";
import { criarRepositorioMestre } from "../mestre/repositorio";
import { alternarVisivel, estadoInicial } from "../revisao/estado";
import type { Selecao } from "../selecao/tipos";
import { criarRepositorioVagas } from "../vagas/repositorio";
import { exportar, nomeDoArquivo } from "./exportar";
import type { DepsExportar } from "./exportar";
import { criarRepositorioExportacoes } from "./repositorio";
import { resumirExportacao } from "./resumo";

describe("nomeDoArquivo", () => {
  it.each([
    ["Rafael Campi", "Acme Pagamentos", "curriculo-rafael-campi-acme-pagamentos.pdf"],
    ["José da Conceição", "Épsilon S/A", "curriculo-jose-da-conceicao-epsilon-s-a.pdf"],
    ["", "", "curriculo.pdf"],
    ["Ana", "", "curriculo-ana.pdf"],
  ])("%s + %s → %s", (nome, empresa, esperado) => expect(nomeDoArquivo(nome, empresa)).toBe(esperado));
});

const mestre = esquemaMestre.parse({
  contato: { nome: "Rafael Campi", email: "r@x.com" },
  resumos: [{ id: "s1", texto: "Backend." }],
  experiencias: [{ id: "e1", empresa: "Alfa", cargo: "Dev", inicio: { mes: 1, ano: 2022 }, fim: "atual", bullets: [{ id: "b1", texto: "Um." }, { id: "b2", texto: "Dois." }] }],
  projetos: [{ id: "p1", nome: "API" }],
  skills: [{ id: "k1", nome: "Python" }],
});
const sel: Selecao = { resumo: "s1", experiencias: [{ id: "e1", bullets: ["b1"] }], projetos: [], skills: ["k1"], cobertura: { b1: ["r1"], k1: ["r1"] }, lacunas: ["r2"] };
const reqs = [{ id: "r1", texto: "Python" }, { id: "r2", texto: "Kubernetes" }];

describe("resumirExportacao", () => {
  const e = estadoInicial(mestre, sel);
  it("conta os requisitos e aponta lacunas", () => {
    const r = resumirExportacao(mestre, e, reqs, sel.cobertura);
    expect(r.requisitos).toEqual({ total: 2, cobertos: 1 });
    expect(r.lacunas.map((l) => l.texto)).toEqual(["Kubernetes"]);
  });
  it("lista o que ficou de fora, por seção", () => {
    const r = resumirExportacao(mestre, e, reqs, sel.cobertura);
    expect(r.ocultos).toEqual([{ secao: "Experiência (Alfa, Dev)", texto: "Dois." }, { secao: "Projetos", texto: "API" }]);
  });
  it("ocultar uma experiência inteira aparece como uma linha só", () => {
    const r = resumirExportacao(mestre, alternarVisivel(e, { tipo: "experiencia", id: "e1" }, mestre), reqs, sel.cobertura);
    expect(r.ocultos.filter((o) => o.secao === "Experiência")).toEqual([{ secao: "Experiência", texto: "Alfa, Dev" }]);
  });
  it("avisa o que falta no contato", () => {
    expect(resumirExportacao(mestre, e, reqs, sel.cobertura).contatoIncompleto).toEqual(["telefone", "cidade"]);
  });
});

const URL = process.env.TEST_ADMIN_DATABASE_URL ?? "postgresql://apply_jobs:apply_jobs@localhost:5433/apply_jobs";
const MIGRACOES = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");
const SCHEMA = `exportar_test_${process.pid}`;
async function conectar(): Promise<pg.Client | null> {
  const client = new pg.Client({ connectionString: URL, connectionTimeoutMillis: 1500 });
  try {
    await client.connect();
    return client;
  } catch {
    return null;
  }
}
const client = await conectar();

describe.skipIf(!client)("exportar", () => {
  const db = client!;
  const vagas = criarRepositorioVagas(db);
  const mestres = criarRepositorioMestre(db);
  const exportacoes = criarRepositorioExportacoes(db);
  const pdfFalso = Buffer.from("%PDF-1.4 falso");
  const deps = (paginas: number, falha?: Error): DepsExportar => ({
    vagas, mestre: mestres, exportacoes,
    gerar: async () => { if (falha) throw falha; return { pdf: pdfFalso, paginas }; },
  });

  beforeAll(async () => {
    await db.query(`CREATE SCHEMA ${SCHEMA}`);
    await db.query(`SET search_path TO ${SCHEMA}`);
    await migrar(db, MIGRACOES);
    for (const [secao, valor] of Object.entries(mestre)) await mestres.salvarSecao(secao as never, valor);
  });
  afterAll(async () => {
    await db.query(`DROP SCHEMA ${SCHEMA} CASCADE`);
    await db.end();
  });

  async function vagaPronta(empresa = "Acme") {
    const id = await vagas.criar({ titulo: "Dev", empresa, texto: "x".repeat(40), jobId: null });
    await vagas.gravarRequisitos(id, reqs);
    await vagas.gravarGeracao(id, { selecao: sel, ajustes: [], modelo: "m" });
    return id;
  }

  it("gera, guarda o PDF e um instantâneo do texto exportado", async () => {
    const id = await vagaPronta("Acme Pagamentos");
    const r = await exportar(deps(1), id);
    expect(r).toMatchObject({ ok: true, paginas: 1 });
    const [guardada] = await exportacoes.listar(id);
    expect(guardada).toMatchObject({ vagaId: id, paginas: 1, arquivo: "curriculo-rafael-campi-acme-pagamentos.pdf" });
    expect((await exportacoes.pdf(guardada!.id))!.equals(pdfFalso)).toBe(true);
    const { rows } = await db.query("SELECT instantaneo FROM forge_exportacoes WHERE id = $1", [guardada!.id]);
    expect(rows[0].instantaneo.experiencias[0]).toMatchObject({ empresa: "Alfa", bullets: ["Um."] });
  });

  it("exporta com os ajustes da Revisão", async () => {
    const id = await vagaPronta();
    const v = (await vagas.obter(id))!;
    await vagas.gravarRevisao(v.geracao!.id, alternarVisivel(estadoInicial(mestre, sel), { tipo: "skill", id: "k1" }, mestre));
    await exportar(deps(1), id);
    const [e] = await exportacoes.listar(id);
    const { rows } = await db.query("SELECT instantaneo FROM forge_exportacoes WHERE id = $1", [e!.id]);
    expect(rows[0].instantaneo.skills).toEqual([]); // a skill ocultada não foi para o PDF
  });

  it("mais de 2 páginas bloqueia e nada é guardado", async () => {
    const id = await vagaPronta();
    const r = await exportar(deps(3), id);
    expect(r).toMatchObject({ ok: false, paginas: 3, erro: expect.stringMatching(/3 páginas.*máximo é 2/) });
    expect(await exportacoes.listar(id)).toEqual([]);
  });

  it("2 páginas passam", async () => {
    expect(await exportar(deps(2), await vagaPronta())).toMatchObject({ ok: true, paginas: 2 });
  });

  it("falha ao gerar vira erro legível, sem lançar nem guardar", async () => {
    const id = await vagaPronta();
    const r = await exportar(deps(1, new Error("Não consegui abrir o Chromium")), id);
    expect(r).toEqual({ ok: false, erro: "Não consegui abrir o Chromium" });
    expect(await exportacoes.listar(id)).toEqual([]);
  });

  it("vaga sem seleção não exporta", async () => {
    const id = await vagas.criar({ titulo: "x", empresa: "", texto: "x".repeat(40), jobId: null });
    expect(await exportar(deps(1), id)).toMatchObject({ ok: false });
  });

  it("a mais recente vem primeiro, e excluir a vaga apaga as exportações", async () => {
    const id = await vagaPronta();
    await exportar(deps(1), id);
    await exportar(deps(2), id);
    expect((await exportacoes.listar(id)).map((e) => e.paginas)).toEqual([2, 1]);
    await vagas.excluir(id);
    expect(await exportacoes.listar(id)).toEqual([]);
  });
});

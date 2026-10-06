import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrar } from "../db/migrar";
import { esquemaMestre } from "../mestre/esquema";
import { criarRepositorioMestre } from "../mestre/repositorio";
import type { Selecao } from "../selecao/tipos";
import { criarRepositorioVagas } from "../vagas/repositorio";
import { carregarEstado } from "./carregar";
import { alternarVisivel, estadoInicial, idsVisiveis } from "./estado";
import { adicionarAoMestre } from "./novoItem";

const URL = process.env.TEST_ADMIN_DATABASE_URL ?? "postgresql://apply_jobs:apply_jobs@localhost:5433/apply_jobs";
const MIGRACOES = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");
const SCHEMA = `revisao_test_${process.pid}`;

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

const sel: Selecao = { resumo: "s1", experiencias: [{ id: "e1", bullets: ["b1"] }], projetos: [], skills: ["k1"], cobertura: { b1: ["r1"] }, lacunas: [] };

describe.skipIf(!client)("revisão no banco", () => {
  const db = client!;
  const vagas = criarRepositorioVagas(db);
  const mestre = criarRepositorioMestre(db);

  beforeAll(async () => {
    await db.query(`CREATE SCHEMA ${SCHEMA}`);
    await db.query(`SET search_path TO ${SCHEMA}`);
    await migrar(db, MIGRACOES);
    const m = esquemaMestre.parse({
      resumos: [{ id: "s1", texto: "A" }],
      experiencias: [{ id: "e1", empresa: "Alfa", cargo: "Dev", bullets: [{ id: "b1", texto: "um" }, { id: "b2", texto: "dois" }] }],
      skills: [{ id: "k1", nome: "Python" }],
    });
    for (const [secao, valor] of Object.entries(m)) await mestre.salvarSecao(secao as never, valor);
  });
  afterAll(async () => {
    await db.query(`DROP SCHEMA ${SCHEMA} CASCADE`);
    await db.end();
  });

  async function vagaPronta() {
    const id = await vagas.criar({ titulo: "t", empresa: "e", texto: "x".repeat(40), jobId: null });
    await vagas.gravarGeracao(id, { selecao: sel, ajustes: [], modelo: "m" });
    return (await vagas.obter(id))!;
  }

  it("a geração nova não tem ajustes", async () => {
    expect((await vagaPronta()).geracao!.revisao).toBeNull();
  });

  it("guarda os ajustes numa camada à parte, sem alterar a seleção da IA", async () => {
    const v = await vagaPronta();
    const m = await mestre.ler();
    const ajustado = alternarVisivel(estadoInicial(m, sel), { tipo: "skill", id: "k1" }, m);
    await vagas.gravarRevisao(v.geracao!.id, ajustado);

    const depois = (await vagas.obter(v.id))!.geracao!;
    expect(depois.selecao).toEqual(sel); // a da IA continua intacta
    expect(depois.revisao).toEqual(ajustado);
    expect(idsVisiveis(carregarEstado(depois.revisao, m, depois.selecao).skills)).toEqual([]);
  });

  it("lista as gerações e escolhe uma delas; voltar a uma antiga copia para uma nova atual", async () => {
    const v = await vagaPronta();
    const m = await mestre.ler();
    const primeira = v.geracao!.id;
    await vagas.gravarRevisao(primeira, alternarVisivel(estadoInicial(m, sel), { tipo: "skill", id: "k1" }, m));
    await vagas.gravarGeracao(v.id, { selecao: { ...sel, skills: [] }, ajustes: [], modelo: "m2" });

    expect((await vagas.listarGeracoes(v.id)).map((g) => [g.numero, g.modelo, g.ajustada])).toEqual([[2, "m2", false], [1, "m", true]]);
    expect((await vagas.obter(v.id))!.geracao).toMatchObject({ numero: 2 });
    expect((await vagas.obter(v.id, primeira))!.geracao).toMatchObject({ id: primeira, numero: 1 });
    expect((await vagas.obter(v.id, 999999))!.geracao).toMatchObject({ numero: 2 }); // id que não é desta vaga: cai na mais recente

    const copia = await vagas.copiarGeracao(primeira);
    const atual = (await vagas.obter(v.id))!.geracao!;
    expect(atual).toMatchObject({ id: copia, numero: 3, modelo: "m" });
    expect(atual.revisao).not.toBeNull(); // os ajustes vêm junto
  });

  it("sem ajustes (ou com dado ilegível), mostra a seleção da IA", async () => {
    const m = await mestre.ler();
    for (const guardado of [null, { lixo: true }, "texto"]) {
      expect(carregarEstado(guardado, m, sel)).toEqual(estadoInicial(m, sel));
    }
  });

  it("acerta o que foi guardado com o mestre de hoje", async () => {
    const m = await mestre.ler();
    const guardado = estadoInicial(m, sel);
    await mestre.salvarSecao("skills", [{ id: "k1", nome: "Python" }, { id: "k2", nome: "Go" }]);
    const atual = await mestre.ler();
    const e = carregarEstado(guardado, atual, sel);
    expect(e.skills).toEqual([{ id: "k1", visivel: true }, { id: "k2", visivel: false }]); // o novo do mestre entra oculto
  });

  describe("adicionarAoMestre", () => {
    it("cria um bullet na experiência certa, com tags", async () => {
      const r = await adicionarAoMestre(mestre, { tipo: "bullet", experienciaId: "e1", texto: "  Kubernetes em produção  ", tags: ["k8s", " ", "cloud"] });
      expect(r.ok).toBe(true);
      const b = (await mestre.ler()).experiencias[0]!.bullets.at(-1)!;
      expect(b).toMatchObject({ texto: "Kubernetes em produção", tags: ["k8s", "cloud"], sempreVisivel: false });
      expect(r.ok && r.id).toBe(b.id);
    });
    it("cria projeto e skill", async () => {
      expect((await adicionarAoMestre(mestre, { tipo: "projeto", nome: "API", descricao: "Open source", tags: [] })).ok).toBe(true);
      expect((await adicionarAoMestre(mestre, { tipo: "skill", nome: "Terraform", categoria: "Cloud", tags: [] })).ok).toBe(true);
      const m = await mestre.ler();
      expect(m.projetos.map((p) => p.nome)).toContain("API");
      expect(m.skills.find((s) => s.nome === "Terraform")).toMatchObject({ categoria: "Cloud" });
    });
    it("recusa texto vazio e experiência inexistente, sem gravar", async () => {
      const antes = await mestre.ler();
      expect(await adicionarAoMestre(mestre, { tipo: "bullet", experienciaId: "e1", texto: "  ", tags: [] })).toMatchObject({ ok: false });
      expect(await adicionarAoMestre(mestre, { tipo: "bullet", experienciaId: "e9", texto: "x", tags: [] })).toMatchObject({ ok: false, erro: expect.stringMatching(/não existe/) });
      expect(await adicionarAoMestre(mestre, { tipo: "skill", nome: " ", categoria: "", tags: [] })).toMatchObject({ ok: false });
      expect(await mestre.ler()).toEqual(antes);
    });
  });
});

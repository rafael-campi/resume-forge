import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrar } from "../db/migrar";
import { esquemaMestre } from "../mestre/esquema";
import { criarRepositorioMestre } from "../mestre/repositorio";
import { criarClienteFalso } from "../selecao/falso";
import { itens, requisitos } from "../selecao/fixtures";
import { normalizarSelecao } from "../selecao/normalizar";
import { promptSelecao } from "../selecao/prompts";
import { SCHEMA_REQUISITOS } from "../selecao/schemas";
import { ErroIA } from "../selecao/tipos";
import type { ClienteIA } from "../selecao/tipos";
import { analisarVaga } from "./analisar";
import type { DepsAnalise } from "./analisar";
import { criarRepositorioVagas } from "./repositorio";
import { extrairJobId } from "./tipos";

describe("extrairJobId", () => {
  it.each([
    ["4012345678", "4012345678"],
    ["  4012345678 ", "4012345678"],
    ["https://www.linkedin.com/jobs/view/4012345678/", "4012345678"],
    ["https://www.linkedin.com/jobs/view/python-developer-at-acme-4012345678?trk=x", "4012345678"],
    ["https://www.linkedin.com/jobs/search/?currentJobId=4012345678&keywords=python", "4012345678"],
  ])("%s → %s", (entrada, esperado) => expect(extrairJobId(entrada)).toBe(esperado));

  it("devolve null para vazio ou para o que não é uma vaga", () => {
    expect(extrairJobId("")).toBeNull();
    expect(extrairJobId("https://example.com/vaga")).toBeNull();
    expect(extrairJobId("abc")).toBeNull();
  });
});

describe("IA falsa", () => {
  const ia = criarClienteFalso();

  it("extrai como requisitos os itens com marcador", async () => {
    const r = (await ia.completarJson({ sistema: "", schema: SCHEMA_REQUISITOS, usuario: "x\n\nVAGA:\nBackend.\n- Node.js e TypeScript\n- AWS (ECS)\n" })) as any;
    expect(r.requisitos).toEqual([{ id: "r1", texto: "Node.js e TypeScript" }, { id: "r2", texto: "AWS (ECS)" }]);
  });

  it("ignora a pontuação final ao casar palavras (PostgreSQL. casa com PostgreSQL)", async () => {
    const itens2 = { resumos: [{ id: "s1", texto: "Dev." }], experiencias: [{ id: "e1", titulo: "Alfa", bullets: [{ id: "b1", texto: "Modelei o schema em PostgreSQL." }] }], projetos: [], skills: [] };
    const reqs = [{ id: "r1", texto: "PostgreSQL e modelagem de dados" }];
    const r = (await ia.completarJson({ sistema: "", schema: {}, usuario: promptSelecao(reqs, itens2) })) as any;
    expect(r.cobertura).toEqual({ b1: ["r1"] });
  });

  it("devolve uma seleção que o validador real aceita, com lacunas honestas", async () => {
    const bruto = await ia.completarJson({ sistema: "", schema: {}, usuario: promptSelecao(requisitos, itens) });
    const r = normalizarSelecao(bruto, itens, requisitos);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.selecao.resumo).toBe("s1");
    expect(r.selecao.lacunas).toEqual(["r3"]); // Kubernetes não está no mestre
    expect(Object.keys(r.selecao.cobertura)).toEqual(expect.arrayContaining(["k1", "k2"]));
    expect(r.ajustes).toEqual([]);
  });
});

const URL = process.env.TEST_ADMIN_DATABASE_URL ?? "postgresql://apply_jobs:apply_jobs@localhost:5433/apply_jobs";
const MIGRACOES = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");
const SCHEMA = `vagas_test_${process.pid}`;

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

describe.skipIf(!client)("vagas e análise", () => {
  const db = client!;
  const vagas = criarRepositorioVagas(db);
  const mestre = criarRepositorioMestre(db);
  const falsa = criarClienteFalso();

  const deps = (cliente: ClienteIA | (() => never), modelo = "teste"): DepsAnalise => ({
    vagas,
    mestre,
    criarIa: typeof cliente === "function" ? cliente : () => ({ cliente, modelo }),
  });
  const nova = (texto = "Backend.\n- Node.js e TypeScript em APIs\n- Kubernetes em produção", jobId: string | null = null) =>
    vagas.criar({ titulo: "Dev Backend", empresa: "Acme", texto, jobId });

  beforeAll(async () => {
    await db.query(`CREATE SCHEMA ${SCHEMA}`);
    await db.query(`SET search_path TO ${SCHEMA}`);
    await migrar(db, MIGRACOES);
  });
  afterAll(async () => {
    await db.query(`DROP SCHEMA ${SCHEMA} CASCADE`);
    await db.end();
  });

  async function preencherMestre() {
    const m = esquemaMestre.parse({
      resumos: [{ id: "s1", texto: "Backend com 6 anos." }],
      experiencias: [{
        id: "e1", empresa: "Alfa", cargo: "Dev", inicio: { mes: 1, ano: 2022 }, fim: "atual",
        bullets: [{ id: "b1", texto: "Construí APIs em Node.js e TypeScript." }, { id: "b2", texto: "Cuidei do suporte." }],
      }],
      skills: [{ id: "k1", nome: "TypeScript" }],
    });
    for (const [secao, valor] of Object.entries(m)) await mestre.salvarSecao(secao as never, valor);
  }

  it("sem o mestre preenchido, vira erro explicando, sem sequer criar a IA", async () => {
    const id = await nova();
    await analisarVaga(deps(() => { throw new Error("não devia criar a IA"); }), id);
    const v = (await vagas.obter(id))!;
    expect(v.estado).toBe("erro");
    expect(v.erro).toMatch(/currículo mestre/);
  });

  describe("com o mestre preenchido", () => {
    beforeAll(preencherMestre);

    it("extrai os requisitos, seleciona e guarda a primeira geração", async () => {
      const id = await nova();
      expect((await vagas.obter(id))).toMatchObject({ estado: "analisando", etapa: "requisitos" });

      await analisarVaga(deps(falsa, "ia-falsa"), id);

      const v = (await vagas.obter(id))!;
      expect(v).toMatchObject({ estado: "pronta", etapa: null, erro: null });
      expect(v.requisitos!.map((r) => r.texto)).toEqual(["Node.js e TypeScript em APIs", "Kubernetes em produção"]);
      expect(v.geracao).toMatchObject({ numero: 1, modelo: "ia-falsa" });
      expect(v.geracao!.selecao.resumo).toBe("s1");
      expect(v.geracao!.selecao.experiencias).toEqual([{ id: "e1", bullets: ["b1"] }]);
      expect(v.geracao!.selecao.lacunas).toEqual(["r2"]);
    });

    it("falha do serviço de IA vira erro legível, sem requisitos guardados", async () => {
      const id = await nova();
      const fora: ClienteIA = { completarJson: async () => { throw new ErroIA("HTTP 529 sobrecarregado", "servico"); } };
      await analisarVaga(deps(fora), id);
      const v = (await vagas.obter(id))!;
      expect(v.estado).toBe("erro");
      expect(v.erro).toMatch(/A IA não respondeu: HTTP 529/);
      expect(v.requisitos).toBeNull();
    });

    it("saída inutilizável esgota as tentativas e vira erro", async () => {
      const id = await nova();
      let chamadas = 0;
      const lixo: ClienteIA = { completarJson: async () => { chamadas++; return { requisitos: "nada" }; } };
      await analisarVaga(deps(lixo), id);
      expect(chamadas).toBe(3); // 1 + 2 novas tentativas
      expect((await vagas.obter(id))!.erro).toMatch(/Não foi possível extrair os requisitos/);
    });

    it("chave da NVIDIA ausente vira erro que diz o que configurar", async () => {
      const id = await nova();
      await analisarVaga(deps(() => { throw new Error("NVIDIA_API_KEY não está configurada."); }), id);
      expect((await vagas.obter(id))!.erro).toMatch(/NVIDIA_API_KEY/);
    });

    it("nova tentativa reaproveita os requisitos já extraídos", async () => {
      const id = await nova();
      let n = 0;
      const cai: ClienteIA = {
        completarJson: async (p) => {
          if (p.schema === SCHEMA_REQUISITOS) return falsa.completarJson(p);
          if (++n === 1) throw new ErroIA("timeout", "servico");
          return falsa.completarJson(p);
        },
      };
      await analisarVaga(deps(cai), id);
      expect((await vagas.obter(id))).toMatchObject({ estado: "erro" });
      expect((await vagas.obter(id))!.requisitos).toHaveLength(2);

      await vagas.iniciarAnalise(id);
      expect((await vagas.obter(id))).toMatchObject({ estado: "analisando", etapa: "selecao", erro: null });

      const semExtrair: ClienteIA = { completarJson: async (p) => { if (p.schema === SCHEMA_REQUISITOS) throw new Error("não devia extrair de novo"); return falsa.completarJson(p); } };
      await analisarVaga(deps(semExtrair), id);
      expect((await vagas.obter(id))).toMatchObject({ estado: "pronta" });
    });

    it("gerar de novo cria a geração 2 e a mais recente é a que aparece", async () => {
      const id = await nova();
      await analisarVaga(deps(falsa), id);
      await vagas.iniciarAnalise(id);
      await analisarVaga(deps(falsa, "outro-modelo"), id);
      expect((await vagas.obter(id))!.geracao).toMatchObject({ numero: 2, modelo: "outro-modelo" });
    });
  });

  it("marca como interrompida a análise parada há mais de 10 minutos", async () => {
    const id = await nova();
    expect((await vagas.obter(id))!.interrompida).toBe(false);
    await db.query("UPDATE forge_vagas SET atualizada_em = now() - interval '11 minutes' WHERE id = $1", [id]);
    expect((await vagas.obter(id))!.interrompida).toBe(true);
  });

  it("acha a vaga pelo job id do LinkedIn e lista as mais recentes primeiro", async () => {
    const a = await nova("a", "7001");
    const b = await nova("b", "7002");
    expect(await vagas.porJobId("7001")).toBe(a);
    expect(await vagas.porJobId("0000")).toBeNull();
    const ids = (await vagas.listar()).map((v) => v.id);
    expect(ids.indexOf(b)).toBeLessThan(ids.indexOf(a));
  });

  it("excluir apaga a vaga e as gerações", async () => {
    const id = await nova();
    await analisarVaga(deps(falsa), id);
    await vagas.excluir(id);
    expect(await vagas.obter(id)).toBeNull();
    expect((await db.query("SELECT count(*)::int AS n FROM forge_geracoes WHERE vaga_id = $1", [id])).rows[0].n).toBe(0);
  });
});

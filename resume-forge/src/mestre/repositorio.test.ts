import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrar } from "../db/migrar";
import { novoId } from "./esquema";
import { criarRepositorioMestre } from "./repositorio";

const URL = process.env.TEST_ADMIN_DATABASE_URL ?? "postgresql://apply_jobs:apply_jobs@localhost:5433/apply_jobs";
const MIGRACOES = join(dirname(fileURLToPath(import.meta.url)), "../../migrations");
const SCHEMA = `mestre_test_${process.pid}`;

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

describe.skipIf(!client)("repositório do mestre", () => {
  const db = client!;
  const repo = criarRepositorioMestre(db);

  beforeAll(async () => {
    await db.query(`CREATE SCHEMA ${SCHEMA}`);
    await db.query(`SET search_path TO ${SCHEMA}`);
  });
  afterAll(async () => {
    await db.query(`DROP SCHEMA ${SCHEMA} CASCADE`);
    await db.end();
  });

  it("migra uma vez: a segunda chamada não aplica nada", async () => {
    expect(await migrar(db, MIGRACOES)).toContain("001_forge_curriculo_mestre");
    expect(await migrar(db, MIGRACOES)).toEqual([]);
  });

  it("sem nada salvo, devolve o mestre vazio", async () => {
    const m = await repo.ler();
    expect(m.contato.nome).toBe("");
    expect(m.skills).toEqual([]);
  });

  it("salva uma seção e lê de volta", async () => {
    const r = await repo.salvarSecao("skills", [{ id: novoId("k"), nome: "TypeScript", categoria: "Linguagens" }]);
    expect(r).toEqual({ ok: true });
    expect((await repo.ler()).skills[0]).toMatchObject({ nome: "TypeScript", categoria: "Linguagens", tags: [] });
  });

  it("salvar uma seção não apaga as outras", async () => {
    await repo.salvarSecao("contato", { nome: "Fulano", email: "f@x.com" });
    await repo.salvarSecao("resumos", [{ id: "s1", texto: "Backend." }]);
    const m = await repo.ler();
    expect(m.contato.nome).toBe("Fulano");
    expect(m.resumos).toHaveLength(1);
    expect(m.skills).toHaveLength(1);
  });

  it("salvar de novo substitui a seção inteira (remover um item funciona)", async () => {
    await repo.salvarSecao("skills", []);
    expect((await repo.ler()).skills).toEqual([]);
  });

  it("recusa dados inválidos sem gravar nada", async () => {
    const r = await repo.salvarSecao("experiencias", [{ id: "e1", inicio: { mes: 99, ano: 2020 } }]);
    expect(r.ok).toBe(false);
    expect((await repo.ler()).experiencias).toEqual([]);
  });

  it("recusa IDs repetidos", async () => {
    const r = await repo.salvarSecao("skills", [{ id: "k1", nome: "A" }, { id: "k1", nome: "B" }]);
    expect(r).toEqual({ ok: false, erros: ["IDs repetidos: k1"] });
  });

  it("recusa uma seção que não existe", async () => {
    expect((await repo.salvarSecao("hobbies" as never, [])).ok).toBe(false);
  });
});

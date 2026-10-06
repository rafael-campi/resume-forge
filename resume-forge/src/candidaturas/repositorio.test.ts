import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarRepositorioCandidaturas } from "./repositorio";

// Lê as tabelas do bot (apply-jobs), então o teste usa as migrações reais dele,
// num schema temporário do mesmo Postgres. Sem o Postgres no ar, é pulado.
const URL = process.env.TEST_ADMIN_DATABASE_URL ?? "postgresql://apply_jobs:apply_jobs@localhost:5433/apply_jobs";
const MIGRACOES = join(dirname(fileURLToPath(import.meta.url)), "../../../apply-jobs/bot/repository/migrations");
const SCHEMA = `dash_test_${process.pid}`;

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

describe.skipIf(!client)("repositório de candidaturas", () => {
  const db = client!;
  const repo = criarRepositorioCandidaturas(db);

  async function vaga(jobId: string, titulo: string, empresa: string, status: string, descricao = "") {
    await db.query("INSERT INTO vagas (job_id, title, company, description) VALUES ($1,$2,$3,$4)", [jobId, titulo, empresa, descricao]);
    await db.query("INSERT INTO candidaturas (job_id, status) VALUES ($1,$2)", [jobId, status]);
  }

  beforeAll(async () => {
    await db.query(`CREATE SCHEMA ${SCHEMA}`);
    await db.query(`SET search_path TO ${SCHEMA}`);
    for (const arquivo of readdirSync(MIGRACOES).filter((f) => f.endsWith(".sql")).sort()) {
      await db.query(readFileSync(join(MIGRACOES, arquivo), "utf-8"));
    }
    await vaga("1", "Python Developer", "Acme", "enviada");
    await vaga("2", "Backend Engineer", "Beta", "revisao_manual", "Vaga remota");
    await vaga("3", "Python Backend", "100%_Gamma", "revisao_manual");
    await vaga("4", "Data Engineer", "Delta", "falhou");
    for (const status of ["vista", "formulario_aberto", "revisao_manual"]) {
      await db.query("INSERT INTO candidatura_historico (job_id, status) VALUES ('2', $1)", [status]);
    }
  });

  afterAll(async () => {
    await db.query(`DROP SCHEMA ${SCHEMA} CASCADE`);
    await db.end();
  });

  it("resume a contagem por Status, com zero para os que não têm vagas", async () => {
    expect(await repo.resumo()).toEqual({
      vista: 0, filtrada: 0, formulario_aberto: 0, enviada: 1, falhou: 1, revisao_manual: 2,
    });
  });

  it("lista todas as candidaturas com o total", async () => {
    const { linhas, total } = await repo.listar({});
    expect(total).toBe(4);
    expect(linhas.map((l) => l.jobId).sort()).toEqual(["1", "2", "3", "4"]);
    expect(linhas.find((l) => l.jobId === "1")).toMatchObject({ titulo: "Python Developer", empresa: "Acme", status: "enviada" });
  });

  it("filtra por Status", async () => {
    const { linhas, total } = await repo.listar({ status: "revisao_manual" });
    expect(total).toBe(2);
    expect(linhas.map((l) => l.jobId).sort()).toEqual(["2", "3"]);
  });

  it("busca por título ou empresa, sem diferenciar maiúsculas", async () => {
    expect((await repo.listar({ busca: "PYTHON" })).linhas.map((l) => l.jobId).sort()).toEqual(["1", "3"]);
    expect((await repo.listar({ busca: "delta" })).linhas.map((l) => l.jobId)).toEqual(["4"]);
  });

  it("trata % e _ da busca como texto, não como curinga", async () => {
    expect((await repo.listar({ busca: "100%_" })).linhas.map((l) => l.jobId)).toEqual(["3"]);
    expect((await repo.listar({ busca: "%" })).total).toBe(1);
  });

  it("respeita o limite, mas o total continua sendo o do filtro", async () => {
    const { linhas, total } = await repo.listar({ limite: 2 });
    expect(linhas).toHaveLength(2);
    expect(total).toBe(4);
  });

  it("devolve o detalhe com a descrição e o histórico em ordem", async () => {
    const detalhe = await repo.detalhe("2");
    expect(detalhe).toMatchObject({ jobId: "2", titulo: "Backend Engineer", descricao: "Vaga remota", status: "revisao_manual" });
    expect(detalhe!.historico.map((e) => e.status)).toEqual(["vista", "formulario_aberto", "revisao_manual"]);
  });

  it("devolve null para uma vaga que não existe", async () => {
    expect(await repo.detalhe("999")).toBeNull();
  });

  it("falha alto quando o bot grava um Status desconhecido", async () => {
    await vaga("5", "Nova", "Eps", "status_novo");
    await expect(repo.resumo()).rejects.toThrow(/status_novo/);
    await db.query("DELETE FROM candidaturas WHERE job_id = '5'");
    await db.query("DELETE FROM vagas WHERE job_id = '5'");
  });
});

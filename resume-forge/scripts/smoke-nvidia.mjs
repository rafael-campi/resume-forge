// Teste de fumaça da NVIDIA Build (docs/spec/mvp.md, seção 4.5).
// Uso:  node scripts/smoke-nvidia.mjs            (chama a API; precisa de NVIDIA_API_KEY)
//       node scripts/smoke-nvidia.mjs --selftest (só testa o validador, sem rede)
// Só envia dados INVENTADOS, sem nome nem contato (regra de privacidade do MVP).
import { readFileSync, existsSync } from "node:fs";

const BASE = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";

// ---------- Dados inventados (mesmos do protótipo) ----------
const VAGA_PADRAO = `Buscamos pessoa desenvolvedora backend pleno para APIs de pagamentos.

Requisitos:
- Node.js e TypeScript em APIs REST
- PostgreSQL e boa modelagem de dados
- Testes automatizados
- Experiência com AWS (ECS, Lambda)
- Mensageria (Kafka ou RabbitMQ)
- Liderança técnica de squads pequenas`;

// NVIDIA_CENARIO=lacunas: pede coisas que o mestre inventado NÃO tem (Kubernetes, Go, Terraform).
const VAGA_LACUNAS = `Buscamos pessoa engenheira de plataforma sênior.

Requisitos:
- Node.js e TypeScript em APIs REST
- PostgreSQL e boa modelagem de dados
- Kubernetes em produção
- Go para ferramentas internas
- Terraform e infraestrutura como código`;
const VAGA = process.env.NVIDIA_CENARIO === "lacunas" ? VAGA_LACUNAS : VAGA_PADRAO;

const RESUMOS = [
  { id: "s1", t: "Desenvolvedor backend com 6 anos de experiência em APIs Node.js e bancos relacionais." },
  { id: "s2", t: "Desenvolvedor full stack com 6 anos de experiência entregando produtos web de ponta a ponta." },
];
const EXPERIENCIAS = [
  { id: "e1", t: "Alfa Logística · Dev Backend · 2022–atual", bullets: [
    { id: "b1", t: "Reduzi a latência p95 das APIs de roteirização de 800ms para 220ms com cache e índices." },
    { id: "b2", t: "Migrei serviços para ECS com deploy contínuo, cortando o tempo de release de 2h para 15min." },
    { id: "b3", t: "Liderei a squad de 4 devs na reescrita do módulo de cotação de frete." },
    { id: "b4", t: "Cobertura de testes do núcleo de cálculo de 35% para 82% com Jest e testes de contrato." },
    { id: "b4b", t: "Organizei o rodízio de plantão e a documentação de runbooks do time." } ] },
  { id: "e2", t: "Beta Commerce · Dev Full Stack · 2019–2022", bullets: [
    { id: "b5", t: "Construí o checkout em React e Node.js que processou R$ 4 mi/mês." },
    { id: "b6", t: "Modelei o schema de pedidos em PostgreSQL com particionamento por mês." },
    { id: "b7", t: "Integrei o fluxo de eventos de pedido via RabbitMQ entre estoque e faturamento." },
    { id: "b7b", t: "Criei o painel interno de atendimento em React com filtros e exportação." } ] },
  { id: "e3", t: "Gama Tech · Estagiário · 2018", bullets: [
    { id: "b8", t: "Corrigi bugs e escrevi scripts de automação em Python." } ] },
];
const PROJETOS = [
  { id: "p1", t: "API de reservas (open source): Node, Postgres, 120 testes e documentação OpenAPI." },
  { id: "p2", t: "Bot de Telegram para controle de gastos pessoais." },
];
const SKILLS = ["TypeScript","Node.js","PostgreSQL","Docker","Jest","React","Python","RabbitMQ"].map((t, i) => ({ id: "k" + (i + 1), t }));

// ---------- Schemas ----------
const SCHEMA_REQ = {
  type: "object", additionalProperties: false, required: ["requisitos"],
  properties: { requisitos: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "texto"],
    properties: { id: { type: "string" }, texto: { type: "string" } } } } },
};
const idList = { type: "array", items: { type: "string" } };
const SCHEMA_SEL = {
  type: "object", additionalProperties: false, required: ["resumo", "experiencias", "projetos", "skills", "cobertura", "lacunas"],
  properties: {
    resumo: { type: "string" },
    experiencias: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "bullets"],
      properties: { id: { type: "string" }, bullets: idList } } },
    projetos: idList, skills: idList,
    cobertura: { type: "object", additionalProperties: idList },
    lacunas: idList,
  },
};

// ---------- Validador (a lógica de 4.3, em função pura) ----------
export function validateReqs(out) {
  const erros = [];
  if (!out || !Array.isArray(out.requisitos) || !out.requisitos.length) return ["sem lista de requisitos"];
  const ids = new Set();
  for (const r of out.requisitos) {
    if (typeof r.id !== "string" || typeof r.texto !== "string") erros.push("requisito sem id/texto");
    else if (ids.has(r.id)) erros.push("requisito duplicado: " + r.id);
    else ids.add(r.id);
  }
  return erros;
}
export function validateSel(out, reqIds) {
  const erros = [], dups = (arr, nome) => { if (new Set(arr).size !== arr.length) erros.push("duplicados em " + nome); };
  if (!out || typeof out !== "object") return ["saída não é objeto"];
  if (!RESUMOS.some(r => r.id === out.resumo)) erros.push("resumo inexistente: " + out.resumo);
  const exps = Array.isArray(out.experiencias) ? out.experiencias : [];
  dups(exps.map(e => e.id), "experiencias");
  for (const e of exps) {
    const real = EXPERIENCIAS.find(x => x.id === e.id);
    if (!real) { erros.push("experiência inexistente: " + e.id); continue; }
    const bs = Array.isArray(e.bullets) ? e.bullets : [];
    dups(bs, "bullets de " + e.id);
    for (const b of bs) if (!real.bullets.some(x => x.id === b)) erros.push(`bullet ${b} não pertence a ${e.id}`);
  }
  const proj = Array.isArray(out.projetos) ? out.projetos : [], sk = Array.isArray(out.skills) ? out.skills : [];
  dups(proj, "projetos"); dups(sk, "skills");
  for (const p of proj) if (!PROJETOS.some(x => x.id === p)) erros.push("projeto inexistente: " + p);
  for (const k of sk) if (!SKILLS.some(x => x.id === k)) erros.push("skill inexistente: " + k);
  const mostrados = new Set([out.resumo, ...exps.flatMap(e => [e.id, ...(e.bullets || [])]), ...proj, ...sk]);
  const cob = out.cobertura && typeof out.cobertura === "object" ? out.cobertura : {};
  const cobertos = new Set();
  for (const [item, reqs] of Object.entries(cob)) {
    if (!mostrados.has(item)) erros.push("cobertura de item não mostrado: " + item);
    for (const r of reqs || []) { if (!reqIds.includes(r)) erros.push("cobertura cita requisito inexistente: " + r); else cobertos.add(r); }
  }
  const lac = Array.isArray(out.lacunas) ? out.lacunas : [];
  const esperadas = reqIds.filter(r => !cobertos.has(r));
  for (const l of lac) if (!reqIds.includes(l)) erros.push("lacuna cita requisito inexistente: " + l);
  if ([...esperadas].sort().join() !== [...lac].sort().join()) erros.push(`lacunas incoerentes: declarou [${lac}] mas sem cobertura são [${esperadas}]`);
  return erros;
}

// ---------- Prompts ----------
const SYS = "Você ajuda a adaptar um currículo a uma vaga. Responda SOMENTE com JSON válido no schema pedido. Nunca invente itens nem IDs: use apenas os IDs fornecidos. Não reescreva texto.";
const promptReq = () => `Extraia os requisitos da vaga abaixo, um por item, com id r1, r2, ... e o texto curto do requisito.\n\nVAGA:\n${VAGA}`;
const itensTxt = () => [
  "RESUMOS (escolha exatamente um id):", ...RESUMOS.map(r => `- ${r.id}: ${r.t}`),
  "EXPERIÊNCIAS E BULLETS:", ...EXPERIENCIAS.flatMap(e => [`- ${e.id}: ${e.t}`, ...e.bullets.map(b => `    - ${b.id}: ${b.t}`)]),
  "PROJETOS:", ...PROJETOS.map(p => `- ${p.id}: ${p.t}`),
  "SKILLS:", ...SKILLS.map(k => `- ${k.id}: ${k.t}`),
].join("\n");
const promptSel = reqs => `Dados os requisitos da vaga e os itens do currículo, escolha o que mostrar.\n- Ordene por relevância para a vaga (mais relevante primeiro), em cada lista.\n- Omitir um item significa ocultá-lo.\n- "cobertura": para cada item mostrado (resumo, experiência, bullet, projeto ou skill), liste os ids de requisitos que ele cobre (pode ser lista vazia ou omitido).\n- "lacunas": ids de requisitos que nenhum item mostrado cobre.\n\nREQUISITOS:\n${reqs.map(r => `- ${r.id}: ${r.texto}`).join("\n")}\n\n${itensTxt()}`;

// ---------- Chamada ----------
const MODOS = {
  guided_json: (schema) => ({ extra_body_nvext: { guided_json: schema } }),
  json_schema: (schema) => ({ response_format: { type: "json_schema", json_schema: { name: "saida", schema, strict: true } } }),
  so_prompt: () => ({}),
};
async function chamar(key, modo, schema, user) {
  const extra = MODOS[modo](schema);
  const body = { model: MODEL, temperature: 0.1, max_tokens: 4096, stream: false,
    messages: [{ role: "system", content: SYS + (modo === "so_prompt" ? "\nSchema JSON esperado:\n" + JSON.stringify(schema) : "") }, { role: "user", content: user }] };
  if (extra.response_format) body.response_format = extra.response_format;
  if (extra.extra_body_nvext) body.nvext = extra.extra_body_nvext;
  const t0 = Date.now();
  const res = await fetch(BASE, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const ms = Date.now() - t0;
  const limites = {};
  res.headers.forEach((v, k) => { if (/ratelimit|retry-after|credit/i.test(k)) limites[k] = v; });
  const txt = await res.text();
  if (!res.ok) return { ok: false, status: res.status, ms, limites, erro: txt.slice(0, 300) };
  let content, fim, usage, temRaciocinio;
  try { const j = JSON.parse(txt), c = j.choices[0]; content = c.message.content; fim = c.finish_reason; usage = j.usage; temRaciocinio = !!(c.message.reasoning_content || c.message.reasoning); } catch { return { ok: false, status: res.status, ms, limites, erro: "resposta fora do formato OpenAI" }; }
  if (typeof content !== "string" || !content.trim()) return { ok: false, status: res.status, ms, limites, erro: `conteúdo vazio (finish_reason=${fim}, raciocínio=${temRaciocinio}, tokens=${JSON.stringify(usage)})` };
  const limpo = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  let json; try { json = JSON.parse(limpo); } catch { return { ok: false, status: res.status, ms, limites, erro: "JSON inválido: " + content.slice(0, 200) }; }
  return { ok: true, ms, limites, json, usage };
}

function chaveDoAmbiente() {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;
  for (const arq of [".env.local", ".env"]) {
    if (!existsSync(arq)) continue;
    const m = readFileSync(arq, "utf8").match(/^\s*(?:export\s+)?NVIDIA_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

async function main() {
  const key = chaveDoAmbiente();
  if (!key) { console.error("Sem chave. Crie .env.local com NVIDIA_API_KEY=... (ou exporte a variável)."); process.exit(2); }
  console.log(`Modelo: ${MODEL}\n`);
  const resumo = [];
  const so = (process.env.NVIDIA_MODOS || "").split(",").filter(Boolean);
  for (const modo of Object.keys(MODOS).filter(m => !so.length || so.includes(m))) {
    process.stdout.write(`[${modo}] 1/2 extrair requisitos... `);
    const a = await chamar(key, modo, SCHEMA_REQ, promptReq());
    if (!a.ok) { console.log(`FALHOU (${a.status ?? "?"}): ${a.erro}`); resumo.push({ modo, ok: false, motivo: a.erro }); if (Object.keys(a.limites).length) console.log("  limites:", a.limites); continue; }
    const e1 = validateReqs(a.json);
    console.log(`${a.ms}ms, ${e1.length ? "erros: " + e1.join("; ") : "ok"}`);
    if (Object.keys(a.limites).length) console.log("  limites:", a.limites);
    if (e1.length) { resumo.push({ modo, ok: false, motivo: e1.join("; ") }); continue; }
    console.log("  requisitos:", a.json.requisitos.map(r => `${r.id}=${r.texto}`).join(" | "));
    process.stdout.write(`[${modo}] 2/2 selecionar... `);
    const b = await chamar(key, modo, SCHEMA_SEL, promptSel(a.json.requisitos));
    if (!b.ok) { console.log(`FALHOU (${b.status ?? "?"}): ${b.erro}`); resumo.push({ modo, ok: false, motivo: b.erro }); continue; }
    const e2 = validateSel(b.json, a.json.requisitos.map(r => r.id));
    console.log(`${b.ms}ms, ${e2.length ? "erros: " + e2.join("; ") : "ok"}`);
    console.log("  seleção:", JSON.stringify(b.json));
    resumo.push({ modo, ok: e2.length === 0, motivo: e2.join("; ") || "ok", ms: a.ms + b.ms });
  }
  console.log("\nResumo:");
  for (const r of resumo) console.log(`- ${r.modo}: ${r.ok ? "OK" : "FALHOU"} ${r.ms ? `(${r.ms}ms total)` : ""} ${r.ok ? "" : "- " + r.motivo}`);
}

function selftest() {
  const reqIds = ["r1", "r2"];
  const bom = { resumo: "s1", experiencias: [{ id: "e1", bullets: ["b1", "b3"] }], projetos: ["p1"], skills: ["k1"],
    cobertura: { b1: ["r1"], b3: ["r2"] }, lacunas: [] };
  const casos = [
    ["saída válida", bom, 0],
    ["id de bullet inventado", { ...bom, experiencias: [{ id: "e1", bullets: ["b1", "b99"] }] }, 1],
    ["bullet na experiência errada", { ...bom, experiencias: [{ id: "e2", bullets: ["b1"] }] }, 1],
    ["resumo inexistente", { ...bom, resumo: "s9" }, 1],
    ["duplicata de skill", { ...bom, skills: ["k1", "k1"] }, 1],
    ["lacuna incoerente", { ...bom, lacunas: ["r1"] }, 1],
    ["cobertura de item oculto", { ...bom, cobertura: { ...bom.cobertura, b2: ["r1"] } }, 1],
  ];
  let falhas = 0;
  for (const [nome, out, min] of casos) {
    const erros = validateSel(out, reqIds), pass = min === 0 ? erros.length === 0 : erros.length >= min;
    if (!pass) falhas++;
    console.log(`${pass ? "ok  " : "FAIL"} ${nome}${erros.length ? " -> " + erros.join("; ") : ""}`);
  }
  console.log(validateReqs({ requisitos: [] }).length ? "ok   requisitos vazios rejeitados" : "FAIL requisitos vazios");
  process.exit(falhas ? 1 : 0);
}

if (process.argv.includes("--selftest")) selftest(); else main().catch(e => { console.error("Erro inesperado:", e.message); process.exit(1); });

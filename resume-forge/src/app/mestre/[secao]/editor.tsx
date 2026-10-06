"use client";

import { useState } from "react";
import { completude } from "../../../mestre/completude";
import type { Mestre, Secao } from "../../../mestre/esquema";
import { novoId } from "../../../mestre/id";
import { ROTULO_SECAO } from "../../../mestre/secoes";
import { salvarSecao } from "../acoes";
import { useAutosave } from "../autosave";
import type { EstadoSalvar } from "../autosave";

type Item = Record<string, any>;
type Campo = {
  chave: string;
  rotulo: string;
  tipo: "texto" | "area" | "tags" | "inicio" | "fim" | "ano" | "sempreVisivel";
  entrada?: "email" | "tel" | "url";
  ajuda?: string;
  fimRotulo?: string;
  linhas?: number;
};

const SEMPRE: Campo = { chave: "sempreVisivel", rotulo: "Sempre visível", tipo: "sempreVisivel", ajuda: "A IA nunca pode ocultar este item." };
const TAGS: Campo = { chave: "tags", rotulo: "Tags", tipo: "tags", ajuda: "Palavras-chave separadas por vírgula. Não aparecem no PDF; ajudam a casar com a vaga." };

const CONTATO: Campo[] = [
  { chave: "nome", rotulo: "Nome completo", tipo: "texto" },
  { chave: "email", rotulo: "E-mail", tipo: "texto", entrada: "email" },
  { chave: "telefone", rotulo: "Telefone", tipo: "texto", entrada: "tel" },
  { chave: "cidade", rotulo: "Cidade", tipo: "texto" },
  { chave: "linkedin", rotulo: "LinkedIn (opcional)", tipo: "texto", entrada: "url" },
  { chave: "github", rotulo: "GitHub (opcional)", tipo: "texto", entrada: "url" },
  { chave: "site", rotulo: "Site (opcional)", tipo: "texto", entrada: "url" },
];

const BULLET: Campo[] = [
  { chave: "texto", rotulo: "Bullet", tipo: "area", linhas: 2 },
  { ...TAGS, ajuda: undefined },
  { ...SEMPRE, ajuda: undefined },
];

type Lista = { prefixo: string; ajuda: string; novoRotulo: string; rotuloItem: (i: Item, n: number) => string; campos: Campo[]; vazio: (id: string) => Item };
const LISTAS: Record<Exclude<Secao, "contato">, Lista> = {
  resumos: {
    prefixo: "s", novoRotulo: "Adicionar versão do resumo",
    ajuda: "Escreva versões diferentes (por exemplo, foco backend e foco full stack). A IA escolhe uma e nunca reescreve.",
    rotuloItem: (_, n) => `Versão ${n}`,
    campos: [{ chave: "texto", rotulo: "Texto do resumo", tipo: "area" }],
    vazio: (id) => ({ id, texto: "" }),
  },
  experiencias: {
    prefixo: "e", novoRotulo: "Adicionar experiência",
    ajuda: "Empresa, cargo e datas são fixos. A IA escolhe e ordena os bullets e pode ocultar a experiência inteira.",
    rotuloItem: (i, n) => [i.empresa, i.cargo].filter(Boolean).join(", ") || `Experiência ${n}`,
    campos: [
      { chave: "empresa", rotulo: "Empresa", tipo: "texto" },
      { chave: "cargo", rotulo: "Cargo", tipo: "texto" },
      { chave: "inicio", rotulo: "Início", tipo: "inicio" },
      { chave: "fim", rotulo: "Fim", tipo: "fim", fimRotulo: "Emprego atual" },
      TAGS, SEMPRE,
    ],
    vazio: (id) => ({ id, empresa: "", cargo: "", inicio: null, fim: null, bullets: [], tags: [], sempreVisivel: false }),
  },
  projetos: {
    prefixo: "p", novoRotulo: "Adicionar projeto", ajuda: "A IA escolhe e ordena os projetos.",
    rotuloItem: (i, n) => i.nome || `Projeto ${n}`,
    campos: [
      { chave: "nome", rotulo: "Nome", tipo: "texto" },
      { chave: "descricao", rotulo: "Descrição", tipo: "area" },
      { chave: "link", rotulo: "Link (opcional)", tipo: "texto", entrada: "url" },
      TAGS, SEMPRE,
    ],
    vazio: (id) => ({ id, nome: "", descricao: "", link: "", tags: [], sempreVisivel: false }),
  },
  formacao: {
    prefixo: "f", novoRotulo: "Adicionar formação", ajuda: "A formação sempre aparece no currículo.",
    rotuloItem: (i, n) => [i.curso, i.instituicao].filter(Boolean).join(", ") || `Formação ${n}`,
    campos: [
      { chave: "instituicao", rotulo: "Instituição", tipo: "texto" },
      { chave: "curso", rotulo: "Curso", tipo: "texto" },
      { chave: "inicio", rotulo: "Início", tipo: "inicio" },
      { chave: "fim", rotulo: "Fim", tipo: "fim", fimRotulo: "Em andamento" },
    ],
    vazio: (id) => ({ id, instituicao: "", curso: "", inicio: null, fim: null }),
  },
  skills: {
    prefixo: "k", novoRotulo: "Adicionar skill",
    ajuda: "Cada skill é um item. A categoria (por exemplo, Linguagens) agrupa as skills no PDF.",
    rotuloItem: (i, n) => i.nome || `Skill ${n}`,
    campos: [{ chave: "nome", rotulo: "Skill", tipo: "texto" }, { chave: "categoria", rotulo: "Categoria (opcional)", tipo: "texto" }, TAGS, SEMPRE],
    vazio: (id) => ({ id, nome: "", categoria: "", tags: [], sempreVisivel: false }),
  },
  certificacoes: {
    prefixo: "c", novoRotulo: "Adicionar certificação", ajuda: "Opcional.",
    rotuloItem: (i, n) => i.nome || `Certificação ${n}`,
    campos: [
      { chave: "nome", rotulo: "Certificação", tipo: "texto" },
      { chave: "emissor", rotulo: "Emissor", tipo: "texto" },
      { chave: "ano", rotulo: "Ano", tipo: "ano" },
      SEMPRE,
    ],
    vazio: (id) => ({ id, nome: "", emissor: "", ano: null, sempreVisivel: false }),
  },
  idiomas: {
    prefixo: "i", novoRotulo: "Adicionar idioma", ajuda: "Os idiomas sempre aparecem no currículo.",
    rotuloItem: (i, n) => i.idioma || `Idioma ${n}`,
    campos: [{ chave: "idioma", rotulo: "Idioma", tipo: "texto" }, { chave: "nivel", rotulo: "Nível", tipo: "texto" }],
    vazio: (id) => ({ id, idioma: "", nivel: "" }),
  },
};

const paraMes = (d: { mes: number; ano: number } | null) => (d ? `${d.ano}-${String(d.mes).padStart(2, "0")}` : "");
function deMes(v: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  // anos parciais enquanto se digita (0002) contam como "ainda sem data"
  return m && +m[1]! >= 1950 && +m[1]! <= 2100 ? { ano: +m[1]!, mes: +m[2]! } : null;
}

function CampoTags({ id, rotulo, valor, onChange, ajuda }: { id: string; rotulo: string; valor: string[]; onChange: (t: string[]) => void; ajuda?: string }) {
  const [texto, setTexto] = useState((valor ?? []).join(", ")); // texto cru: permite digitar a vírgula
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} type="text" value={texto} aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(e.target.value.split(",").map((t) => t.trim()).filter(Boolean));
        }} />
      {ajuda && <p id={`${id}-ajuda`} className="ajuda">{ajuda}</p>}
    </div>
  );
}

function CampoEditor({ campo, item, idBase, onChange }: { campo: Campo; item: Item; idBase: string; onChange: (patch: Item) => void }) {
  const id = `${idBase}-${campo.chave}`;
  const valor = item[campo.chave];
  const ajuda = campo.ajuda ? <p id={`${id}-ajuda`} className="ajuda">{campo.ajuda}</p> : null;
  const desc = campo.ajuda ? `${id}-ajuda` : undefined;

  switch (campo.tipo) {
    case "sempreVisivel":
      return (
        <div className="campo campo-marca">
          <label><input type="checkbox" checked={Boolean(valor)} onChange={(e) => onChange({ [campo.chave]: e.target.checked })} /> {campo.rotulo}</label>
          {ajuda}
        </div>
      );
    case "tags":
      return <CampoTags id={id} rotulo={campo.rotulo} valor={valor} ajuda={campo.ajuda} onChange={(t) => onChange({ [campo.chave]: t })} />;
    case "area":
      return (
        <div className="campo campo-largo">
          <label htmlFor={id}>{campo.rotulo}</label>
          <textarea id={id} rows={campo.linhas ?? 4} value={valor ?? ""} aria-describedby={desc} onChange={(e) => onChange({ [campo.chave]: e.target.value })} />
          {ajuda}
        </div>
      );
    case "inicio":
      return (
        <div className="campo">
          <label htmlFor={id}>{campo.rotulo}</label>
          <input id={id} type="month" value={paraMes(valor)} onChange={(e) => onChange({ [campo.chave]: deMes(e.target.value) })} />
        </div>
      );
    case "fim": {
      const atual = valor === "atual";
      return (
        <div className="campo">
          <label htmlFor={id}>{campo.rotulo}</label>
          <input id={id} type="month" disabled={atual} value={atual ? "" : paraMes(valor)} onChange={(e) => onChange({ [campo.chave]: deMes(e.target.value) })} />
          <label className="marca-inline">
            <input type="checkbox" checked={atual} onChange={(e) => onChange({ [campo.chave]: e.target.checked ? "atual" : null })} /> {campo.fimRotulo ?? "Atual"}
          </label>
        </div>
      );
    }
    case "ano":
      return (
        <div className="campo">
          <label htmlFor={id}>{campo.rotulo}</label>
          <input id={id} type="number" min={1950} max={2100} value={valor ?? ""} onChange={(e) => onChange({ [campo.chave]: e.target.value === "" ? null : Number(e.target.value) })} />
        </div>
      );
    default:
      return (
        <div className="campo">
          <label htmlFor={id}>{campo.rotulo}</label>
          <input id={id} type={campo.entrada ?? "text"} value={valor ?? ""} aria-describedby={desc} onChange={(e) => onChange({ [campo.chave]: e.target.value })} />
          {ajuda}
        </div>
      );
  }
}

function Cartao({ titulo, temConteudo, onRemover, children, nivel = 2 }: { titulo: string; temConteudo: boolean; onRemover: () => void; children: React.ReactNode; nivel?: 2 | 3 }) {
  const Titulo = nivel === 2 ? "h2" : "h3";
  return (
    <section className="cartao">
      <div className="cartao-topo">
        <Titulo>{titulo}</Titulo>
        <button type="button" className="remover" onClick={() => { if (!temConteudo || window.confirm("Remover este item? Não há como desfazer.")) onRemover(); }}>
          Remover
        </button>
      </div>
      <div className="campos">{children}</div>
      {/* os filhos extras (bullets) entram depois dos campos */}
    </section>
  );
}

const temConteudo = (item: Item) => Object.entries(item).some(([k, v]) => k !== "id" && k !== "sempreVisivel" && (Array.isArray(v) ? v.length > 0 : v !== "" && v !== null && v !== false));

function Estado({ estado, tentarDeNovo }: { estado: EstadoSalvar; tentarDeNovo: () => void }) {
  const texto = { salvo: "Salvo.", pendente: "Alterações ainda não salvas…", salvando: "Salvando…", erro: "" }[estado.tipo];
  return (
    <p className="salvamento" role="status" aria-live="polite" data-estado={estado.tipo}>
      {estado.tipo === "erro" ? (
        <>Não foi possível salvar: {estado.mensagem}. <button type="button" className="limpar" onClick={tentarDeNovo}>Tentar de novo</button></>
      ) : texto}
    </p>
  );
}

export function Editor({ secao, mestreInicial }: { secao: Secao; mestreInicial: Mestre }) {
  const [valor, setValor] = useState<any>(mestreInicial[secao]);
  const { estado, tentarDeNovo } = useAutosave(valor, (v) => salvarSecao(secao, v));
  const pendencias = completude({ ...mestreInicial, [secao]: valor } as Mestre)[secao].pendencias;

  const cabecalho = (
    <>
      <h1>{ROTULO_SECAO[secao]}</h1>
      <Estado estado={estado} tentarDeNovo={tentarDeNovo} />
      {pendencias.length > 0 && (
        <ul className="pendencias" aria-label="O que falta nesta seção">
          {pendencias.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
    </>
  );

  if (secao === "contato") {
    return (
      <>
        {cabecalho}
        <p className="suave">O nome e o contato nunca são enviados para a IA: só entram no PDF.</p>
        <div className="campos">
          {CONTATO.map((c) => <CampoEditor key={c.chave} campo={c} item={valor} idBase="contato" onChange={(p) => setValor({ ...valor, ...p })} />)}
        </div>
      </>
    );
  }

  const cfg = LISTAS[secao];
  const itens: Item[] = valor;
  const mudarItem = (i: number, patch: Item) => setValor(itens.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  return (
    <>
      {cabecalho}
      <p className="suave">{cfg.ajuda}</p>
      {itens.map((item, i) => (
        <Cartao key={item.id} titulo={cfg.rotuloItem(item, i + 1)} temConteudo={temConteudo(item)} onRemover={() => setValor(itens.filter((_, j) => j !== i))}>
          {cfg.campos.map((c) => <CampoEditor key={c.chave} campo={c} item={item} idBase={item.id} onChange={(p) => mudarItem(i, p)} />)}
          {secao === "experiencias" && (
            <div className="campo-largo bullets">
              <h3>Bullets</h3>
              <p className="ajuda">Escreva vários: a IA escolhe e ordena os mais relevantes para cada vaga.</p>
              {(item.bullets as Item[]).map((b, k) => (
                <Cartao key={b.id} nivel={3} titulo={`Bullet ${k + 1}`} temConteudo={temConteudo(b)}
                  onRemover={() => mudarItem(i, { bullets: item.bullets.filter((_: Item, j: number) => j !== k) })}>
                  {BULLET.map((c) => (
                    <CampoEditor key={c.chave} campo={c} item={b} idBase={b.id}
                      onChange={(p) => mudarItem(i, { bullets: item.bullets.map((x: Item, j: number) => (j === k ? { ...x, ...p } : x)) })} />
                  ))}
                </Cartao>
              ))}
              <button type="button" className="adicionar" onClick={() => mudarItem(i, { bullets: [...item.bullets, { id: novoId("b"), texto: "", tags: [], sempreVisivel: false }] })}>
                Adicionar bullet
              </button>
            </div>
          )}
        </Cartao>
      ))}
      <button type="button" className="adicionar" onClick={() => setValor([...itens, cfg.vazio(novoId(cfg.prefixo))])}>
        {cfg.novoRotulo}
      </button>
    </>
  );
}

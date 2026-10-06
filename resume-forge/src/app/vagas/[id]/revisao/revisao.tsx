"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FolhaMedida } from "../../../../curriculo/folha-medida";
import type { Medida } from "../../../../curriculo/folha-medida";
import { montarCurriculo, periodo } from "../../../../curriculo/montar";
import type { Mestre } from "../../../../mestre/esquema";
import { alternarVisivel, coberturaAtual, ehFixo, estadoInicial, moverItem, reconciliar, registrarNovo, usarResumo } from "../../../../revisao/estado";
import type { EstadoRevisao, ItemEstado, Ref } from "../../../../revisao/estado";
import { aplicarNovoNoMestre } from "../../../../revisao/novoItem";
import type { EntradaNovoItem } from "../../../../revisao/novoItem";
import type { Requisito, Selecao } from "../../../../selecao/tipos";
import { useAutosave } from "../../../mestre/autosave";
import { analisarDeNovo } from "../../acoes";
import { salvarRevisao, tornarAtual } from "./acoes";
import { FormularioItem } from "./formulario-item";

type GeracaoLista = { id: number; numero: number; modelo: string; criadaEm: string; ajustada: boolean };
type Props = {
  vaga: { id: number; titulo: string; empresa: string };
  geracao: { id: number; numero: number };
  geracoes: GeracaoLista[];
  ehAtual: boolean;
  requisitos: Requisito[];
  selecaoIA: Selecao;
  mestreInicial: Mestre;
  estadoInicial: EstadoRevisao;
};

const dataCurta = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const resumir = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

type LinhaProps = {
  texto: React.ReactNode;
  rotulo: string;
  visivel: boolean;
  fixo?: boolean;
  novo?: boolean;
  cobre?: string[];
  cabeca?: boolean;
  onSubir?: () => void;
  onDescer?: () => void;
  onAlternar?: () => void;
  extra?: React.ReactNode;
};

function Linha({ texto, rotulo, visivel, fixo, novo, cobre = [], cabeca, onSubir, onDescer, onAlternar, extra }: LinhaProps) {
  return (
    <li className="item-revisao" data-oculto={!visivel} data-cabeca={cabeca}>
      <div className="item-linha">
        <div className="item-texto">
          <span>{texto}</span>
          {novo && <span className="etiqueta novo">novo · a IA ainda não viu</span>}
          {cobre.length > 0 && <span className="etiqueta" title={`Cobre: ${cobre.join("; ")}`}>cobre {cobre.length}</span>}
          {fixo && <span className="etiqueta">sempre visível</span>}
        </div>
        <div className="item-controles">
          {visivel && <button type="button" onClick={onSubir} disabled={!onSubir} aria-label={`Subir: ${rotulo}`}>↑</button>}
          {visivel && <button type="button" onClick={onDescer} disabled={!onDescer} aria-label={`Descer: ${rotulo}`}>↓</button>}
          {!fixo && <button type="button" onClick={onAlternar} aria-label={`${visivel ? "Ocultar" : "Mostrar"}: ${rotulo}`}>{visivel ? "Ocultar" : "Mostrar"}</button>}
        </div>
      </div>
      {extra}
    </li>
  );
}

/** Visíveis na ordem, depois os ocultos: subir e descer só consideram os visíveis. */
function separar(lista: ItemEstado[]) {
  const visiveis = lista.filter((i) => i.visivel);
  return { visiveis, ocultos: lista.filter((i) => !i.visivel) };
}

function Secao({ titulo, visiveis, total, aberta, children }: { titulo: string; visiveis: number; total: number; aberta?: boolean; children: React.ReactNode }) {
  return (
    <details className="secao-revisao" open={aberta}>
      <summary><span>{titulo}</span><span className="contagem">{visiveis} de {total} visíveis</span></summary>
      <div className="secao-corpo">{children}</div>
    </details>
  );
}

export function Revisao(p: Props) {
  const router = useRouter();
  const [mestre, setMestre] = useState(p.mestreInicial);
  const [estado, setEstado] = useState(p.estadoInicial);
  const [medida, setMedida] = useState<Medida>({ fracao: 1, paginas: 1 });
  const [formAberto, setFormAberto] = useState<string | null>(null); // "lacuna:r1", "bullet:e1", "projeto", "skill"
  const { estado: salvamento, tentarDeNovo } = useAutosave(estado, (e) => salvarRevisao(p.geracao.id, e));

  const cobertura = useMemo(() => coberturaAtual(estado, p.requisitos, p.selecaoIA.cobertura), [estado, p.requisitos, p.selecaoIA.cobertura]);
  const lacunas = cobertura.filter((c) => c.itens === 0).map((c) => c.requisito);
  const curriculo = useMemo(() => montarCurriculo(mestre, estado), [mestre, estado]);

  const textoReq = (id: string) => p.requisitos.find((r) => r.id === id)?.texto ?? id;
  const cobreDe = (id: string) => [...Object.entries(p.selecaoIA.cobertura), ...Object.entries(estado.coberturaManual)].filter(([item, rs]) => item === id && rs.length).flatMap(([, rs]) => rs.map(textoReq));
  const novo = (id: string) => estado.novos.includes(id);

  const mover = (ref: Ref, d: -1 | 1) => setEstado((e) => moverItem(e, ref, d));
  const alternar = (ref: Ref) => setEstado((e) => alternarVisivel(e, ref, mestre));

  function criado(entrada: EntradaNovoItem, id: string, requisitoId?: string) {
    setMestre((m) => aplicarNovoNoMestre(m, entrada, id));
    setEstado((e) => registrarNovo(e, entrada.tipo === "bullet" ? { tipo: "bullet", experienciaId: entrada.experienciaId, id, requisitoId } : { tipo: entrada.tipo, id, requisitoId }));
    setFormAberto(null);
  }

  async function regenerar() {
    const base = reconciliar(estadoInicial(p.mestreInicial, p.selecaoIA), mestre);
    const ajustada = JSON.stringify(estado) !== JSON.stringify(base);
    if (ajustada && !window.confirm(`Você ajustou esta seleção (Seleção ${p.geracao.numero}). Gerar uma nova começa do zero, mas os seus ajustes continuam guardados nesta seleção e você pode voltar a ela depois. Continuar?`)) return;
    await analisarDeNovo(p.vaga.id);
    router.push(`/vagas/${p.vaga.id}`);
  }

  async function voltarParaEsta() {
    await tornarAtual(p.geracao.id);
    router.push(`/vagas/${p.vaga.id}/revisao`);
  }

  const exps = separar(estado.experiencias) as { visiveis: typeof estado.experiencias; ocultos: typeof estado.experiencias };
  const expMestre = (id: string) => mestre.experiencias.find((x) => x.id === id)!;
  const rotuloExp = (id: string) => { const x = expMestre(id); return [x.empresa, x.cargo].filter(Boolean).join(", ") || "Experiência sem nome"; };
  const todasExp = [...exps.visiveis, ...exps.ocultos].map((x) => ({ id: x.id, rotulo: rotuloExp(x.id) }));

  const pos = (lista: ItemEstado[], id: string) => { const v = lista.filter((i) => i.visivel); const k = v.findIndex((i) => i.id === id); return { sobe: k > 0, desce: k >= 0 && k < v.length - 1 }; };

  const estimativa = medida.paginas > 2 ? "Passa de 2 páginas: oculte itens para poder exportar." : medida.paginas === 2 ? "Cerca de 2 páginas (o alvo é 1)." : "Cabe em 1 página.";
  const tom = medida.paginas > 2 ? "ruim" : medida.paginas === 2 ? "aviso" : "bom";

  return (
    <div className="revisao">
      <header className="faixa-revisao">
        <div className="faixa-vaga">
          <Link className="voltar" href={`/vagas/${p.vaga.id}`}>Voltar à vaga</Link>
          <strong>{p.vaga.titulo || "Vaga sem título"}</strong>
          {p.vaga.empresa && <span className="suave">{p.vaga.empresa}</span>}
        </div>
        <div className="faixa-medidas">
          <p>
            <strong>{cobertura.length - lacunas.length} de {cobertura.length}</strong> requisitos cobertos
            {lacunas.length > 0 && <>, <strong className="aviso-texto">{lacunas.length} {lacunas.length === 1 ? "lacuna" : "lacunas"}</strong></>}
          </p>
          <div className="medidor" data-tom={tom} role="img" aria-label={`Estimativa de páginas: ${medida.fracao.toFixed(1)}. ${estimativa}`}>
            <i style={{ width: `${Math.min(100, (medida.fracao / 2) * 100)}%` }} />
            <b />
          </div>
          <p className="suave pequeno">{estimativa} <span>(estimativa; o número final vem do PDF)</span></p>
        </div>
        <div className="faixa-acoes">
          <p className="salvamento" role="status" aria-live="polite" data-estado={salvamento.tipo}>
            {salvamento.tipo === "salvo" && "Ajustes salvos."}
            {salvamento.tipo === "pendente" && "Alterações ainda não salvas…"}
            {salvamento.tipo === "salvando" && "Salvando…"}
            {salvamento.tipo === "erro" && <>Não foi possível salvar: {salvamento.mensagem}. <button type="button" className="limpar" onClick={tentarDeNovo}>Tentar de novo</button></>}
          </p>
          <div className="acoes">
            {p.geracoes.length > 1 && (
              <>
                <label className="sr-only" htmlFor="geracao">Seleção</label>
                <select id="geracao" value={p.geracao.id} onChange={(e) => router.push(`/vagas/${p.vaga.id}/revisao?geracao=${e.target.value}`)}>
                  {p.geracoes.map((g) => <option key={g.id} value={g.id}>Seleção {g.numero}, {dataCurta(g.criadaEm)}{g.ajustada ? ", ajustada" : ""}</option>)}
                </select>
              </>
            )}
            <button type="button" className="adicionar" onClick={regenerar}>Regenerar</button>
            {medida.paginas > 2 ? (
              <button type="button" className="principal" disabled title="Passa de 2 páginas: oculte itens para poder exportar.">Continuar para exportar</button>
            ) : (
              <Link className="principal" href={`/vagas/${p.vaga.id}/exportar${p.ehAtual ? "" : `?geracao=${p.geracao.id}`}`}>Continuar para exportar</Link>
            )}
          </div>
        </div>
      </header>

      {!p.ehAtual && (
        <p className="aviso" role="note">
          Você está vendo uma seleção antiga (Seleção {p.geracao.numero}).{" "}
          <button type="button" className="adicionar" onClick={voltarParaEsta}>Voltar a esta e torná-la a atual</button>
        </p>
      )}

      <div className="duas-colunas">
        <div className="coluna-lista">
          {lacunas.length > 0 && (
            <section className="lacunas" aria-labelledby="titulo-lacunas">
              <h2 id="titulo-lacunas">{lacunas.length} {lacunas.length === 1 ? "lacuna" : "lacunas"}</h2>
              <p className="suave">Requisitos que nenhum item visível cobre. Lacunas não impedem de exportar. Só escreva um bullet se for verdade.</p>
              <ul>
                {lacunas.map((l) => (
                  <li key={l.id}>
                    <div className="lacuna-linha">
                      <mark>{l.texto}</mark>
                      <button type="button" className="adicionar" onClick={() => setFormAberto(formAberto === `lacuna:${l.id}` ? null : `lacuna:${l.id}`)} aria-expanded={formAberto === `lacuna:${l.id}`}>+ bullet</button>
                    </div>
                    {formAberto === `lacuna:${l.id}` && (
                      <FormularioItem tipo="bullet" experiencias={todasExp} requisito={l.texto} onCriado={(e, id) => criado(e, id, l.id)} onCancelar={() => setFormAberto(null)} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Secao titulo="Resumo" visiveis={1} total={mestre.resumos.length} aberta>
            <ul className="itens">
              {mestre.resumos.map((r) => (
                <li key={r.id} className="item-revisao" data-oculto={r.id !== estado.resumo}>
                  <div className="item-linha">
                    <div className="item-texto">
                      <span>{r.texto || <em className="suave">versão em branco</em>}</span>
                      {r.id === estado.resumo && <span className="etiqueta bom">em uso</span>}
                    </div>
                    <div className="item-controles">
                      {r.id !== estado.resumo && <button type="button" onClick={() => setEstado((e) => usarResumo(e, r.id))} aria-label={`Usar este resumo: ${resumir(r.texto, 40)}`}>Usar este</button>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="ajuda">Versões novas do resumo se criam no <Link href="/mestre/resumos">formulário do mestre</Link>.</p>
          </Secao>

          <Secao titulo="Experiência" visiveis={exps.visiveis.length} total={estado.experiencias.length} aberta>
            <ul className="itens">
              {[...exps.visiveis, ...exps.ocultos].map((x) => {
                const exp = expMestre(x.id);
                const ref: Ref = { tipo: "experiencia", id: x.id };
                const { sobe, desce } = pos(estado.experiencias, x.id);
                const bl = separar(x.bullets);
                return (
                  <Linha key={x.id} cabeca visivel={x.visivel} fixo={ehFixo(mestre, ref)} rotulo={rotuloExp(x.id)}
                    texto={<><strong>{rotuloExp(x.id)}</strong> <span className="suave">{periodo(exp.inicio, exp.fim)}</span></>}
                    onSubir={sobe ? () => mover(ref, -1) : undefined} onDescer={desce ? () => mover(ref, 1) : undefined} onAlternar={() => alternar(ref)}
                    extra={x.visivel ? (
                      <>
                        <ul className="itens aninhados">
                          {[...bl.visiveis, ...bl.ocultos].map((b) => {
                            const bref: Ref = { tipo: "bullet", experienciaId: x.id, id: b.id };
                            const bp = pos(x.bullets, b.id);
                            const texto = exp.bullets.find((y) => y.id === b.id)?.texto ?? "";
                            return (
                              <Linha key={b.id} visivel={b.visivel} fixo={ehFixo(mestre, bref)} novo={novo(b.id)} cobre={cobreDe(b.id)} rotulo={resumir(texto, 40)} texto={texto}
                                onSubir={bp.sobe ? () => mover(bref, -1) : undefined} onDescer={bp.desce ? () => mover(bref, 1) : undefined} onAlternar={() => alternar(bref)} />
                            );
                          })}
                        </ul>
                        {formAberto === `bullet:${x.id}` ? (
                          <FormularioItem tipo="bullet" experiencias={[{ id: x.id, rotulo: rotuloExp(x.id) }]} onCriado={(e, id) => criado(e, id)} onCancelar={() => setFormAberto(null)} />
                        ) : (
                          <button type="button" className="adicionar" onClick={() => setFormAberto(`bullet:${x.id}`)}>+ bullet nesta experiência</button>
                        )}
                      </>
                    ) : <p className="ajuda">Oculta: nenhum bullet dela aparece no currículo.</p>}
                  />
                );
              })}
            </ul>
            <p className="ajuda">Experiências novas se criam no <Link href="/mestre/experiencias">formulário do mestre</Link>.</p>
          </Secao>

          {(["projetos", "skills"] as const).map((chave) => {
            const tipo = chave === "projetos" ? "projeto" : "skill";
            const lista = estado[chave];
            const { visiveis, ocultos } = separar(lista);
            const texto = (id: string) => (chave === "projetos" ? (() => { const x = mestre.projetos.find((y) => y.id === id); return x ? (x.descricao ? `${x.nome}: ${x.descricao}` : x.nome) : ""; })() : mestre.skills.find((y) => y.id === id)?.nome ?? "");
            return (
              <Secao key={chave} titulo={chave === "projetos" ? "Projetos" : "Skills"} visiveis={visiveis.length} total={lista.length}>
                <ul className="itens">
                  {[...visiveis, ...ocultos].map((i) => {
                    const ref: Ref = { tipo, id: i.id };
                    const ip = pos(lista, i.id);
                    return (
                      <Linha key={i.id} visivel={i.visivel} fixo={ehFixo(mestre, ref)} novo={novo(i.id)} cobre={cobreDe(i.id)} rotulo={resumir(texto(i.id), 40)} texto={texto(i.id)}
                        onSubir={ip.sobe ? () => mover(ref, -1) : undefined} onDescer={ip.desce ? () => mover(ref, 1) : undefined} onAlternar={() => alternar(ref)} />
                    );
                  })}
                </ul>
                {formAberto === tipo
                  ? <FormularioItem tipo={tipo} onCriado={(e, id) => criado(e, id)} onCancelar={() => setFormAberto(null)} />
                  : <button type="button" className="adicionar" onClick={() => setFormAberto(tipo)}>{tipo === "projeto" ? "+ projeto" : "+ skill"}</button>}
              </Secao>
            );
          })}
        </div>

        <aside className="coluna-folha" aria-label="Pré-visualização">
          <FolhaMedida curriculo={curriculo} onMedida={setMedida} />
        </aside>
      </div>
    </div>
  );
}

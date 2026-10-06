import Link from "next/link";
import { notFound } from "next/navigation";
import { repositorioCandidaturas } from "../../../candidaturas/pool";
import { repositorioMestre } from "../../../mestre/pool";
import { repositorioVagas } from "../../../vagas/pool";
import { coberturaPorRequisito, resolverSelecao } from "../../../vagas/resolver";
import type { ItemResolvido } from "../../../vagas/resolver";
import { analisarDeNovo } from "../acoes";
import { Estado } from "../estado";
import { Acompanhar } from "./acompanhar";
import { Excluir } from "./excluir";

export const dynamic = "force-dynamic";

const Item = ({ item }: { item: ItemResolvido }) =>
  item.texto === null ? <em className="suave">item removido do mestre</em> : <>{item.texto}</>;

export default async function DetalheVaga({ params }: { params: Promise<{ id: string }> }) {
  const { id: idTexto } = await params;
  const id = Number(idTexto);
  if (!Number.isInteger(id)) notFound();
  const vaga = await (await repositorioVagas()).obter(id);
  if (!vaga) notFound();

  const noBot = vaga.jobId ? await repositorioCandidaturas().detalhe(vaga.jobId).catch(() => null) : null;
  const analisando = vaga.estado === "analisando" && !vaga.interrompida;
  const reanalisar = analisarDeNovo.bind(null, id);

  return (
    <>
      <Link className="voltar" href="/vagas">Voltar às vagas</Link>
      <div className="cabecalho">
        <h1>{vaga.titulo || "Vaga sem título"}</h1>
        <Estado estado={vaga.interrompida ? "erro" : vaga.estado} />
      </div>
      <p className="suave">
        {vaga.empresa && <>{vaga.empresa}. </>}
        {vaga.jobId && (
          <>
            <a href={`https://www.linkedin.com/jobs/view/${vaga.jobId}/`} target="_blank" rel="noopener noreferrer">Abrir no LinkedIn</a>
            {noBot && <>. <Link href={`/candidaturas/${vaga.jobId}`}>Ver a candidatura do bot</Link></>}
          </>
        )}
      </p>

      {analisando && <Acompanhar etapa={vaga.etapa} />}

      {(vaga.estado === "erro" || vaga.interrompida) && (
        <div className="vazio" role="alert">
          <p>{vaga.interrompida ? "A análise foi interrompida (o servidor pode ter sido reiniciado)." : "Não consegui analisar esta vaga."}</p>
          {vaga.erro && !vaga.interrompida && <p className="suave">{vaga.erro}</p>}
          <form action={reanalisar}><button type="submit" className="principal">Tentar de novo</button></form>
        </div>
      )}

      {vaga.estado === "pronta" && vaga.geracao && vaga.requisitos && (
        <Resultado vaga={vaga} />
      )}

      <details className="texto-vaga">
        <summary>Texto da vaga</summary>
        <p className="descricao">{vaga.texto}</p>
      </details>

      <div className="acoes">
        {vaga.estado === "pronta" && (
          <form action={reanalisar}><button type="submit" className="adicionar">Gerar nova seleção</button></form>
        )}
        <Excluir id={id} />
      </div>
    </>
  );
}

async function Resultado({ vaga }: { vaga: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof repositorioVagas>>["obter"]>>> }) {
  const geracao = vaga.geracao!;
  const sel = resolverSelecao(geracao.selecao, await (await repositorioMestre()).ler());
  const cobertura = coberturaPorRequisito(vaga.requisitos!, geracao.selecao);
  const lacunas = cobertura.filter((c) => c.itens === 0).length;

  return (
    <>
      <p className="suave">Seleção {geracao.numero}, feita pelo modelo {geracao.modelo}. Nada foi escrito pela IA: é só o que já está no seu mestre.</p>

      <h2>Requisitos da vaga</h2>
      <p>{cobertura.length - lacunas} de {cobertura.length} cobertos{lacunas > 0 && <>, <strong>{lacunas} {lacunas === 1 ? "lacuna" : "lacunas"}</strong></>}.</p>
      <ul className="requisitos">
        {cobertura.map(({ requisito, itens }) => (
          <li key={requisito.id} data-lacuna={itens === 0}>
            <span>{requisito.texto}</span>
            <span className="cobertura">{itens === 0 ? "Lacuna" : `Coberto por ${itens} ${itens === 1 ? "item" : "itens"}`}</span>
          </li>
        ))}
      </ul>

      <h2>O que a IA escolheu mostrar</h2>
      <h3>Resumo</h3>
      <p className="descricao"><Item item={sel.resumo} /></p>
      <h3>Experiência</h3>
      {sel.experiencias.length === 0 ? <p className="suave">Nenhuma experiência escolhida.</p> : sel.experiencias.map((e) => (
        <div key={e.id} className="escolha">
          <strong>{e.titulo ?? <em className="suave">experiência removida do mestre</em>}</strong>
          <ul>{e.bullets.map((b) => <li key={b.id}><Item item={b} /></li>)}</ul>
        </div>
      ))}
      {sel.projetos.length > 0 && (
        <>
          <h3>Projetos</h3>
          <ul>{sel.projetos.map((p) => <li key={p.id}><Item item={p} /></li>)}</ul>
        </>
      )}
      {sel.skills.length > 0 && (
        <>
          <h3>Skills</h3>
          <p>{sel.skills.map((s, i) => <span key={s.id}>{i > 0 && ", "}<Item item={s} /></span>)}</p>
        </>
      )}
      {geracao.ajustes.length > 0 && (
        <p className="suave">O código corrigiu sozinho: {geracao.ajustes.join("; ")}.</p>
      )}
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { repositorioCandidaturas } from "../../../candidaturas/pool";
import { repositorioVagas } from "../../../vagas/pool";
import { formatarDataHora, ROTULO } from "../../formatar";
import { corDe } from "../../status";

export const dynamic = "force-dynamic";

export default async function DetalheCandidatura({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const vaga = await repositorioCandidaturas().detalhe(decodeURIComponent(jobId));
  if (!vaga) notFound();
  const adaptada = await (await repositorioVagas()).porJobId(vaga.jobId).catch(() => null);

  return (
    <>
      <Link className="voltar" href="/candidaturas">Voltar às candidaturas</Link>
      <div className="cabecalho">
        <h1>{vaga.titulo}</h1>
        <span className="selo" style={corDe(vaga.status)}>{ROTULO[vaga.status]}</span>
      </div>
      <p className="suave">
        {vaga.empresa}{vaga.local ? `, ${vaga.local}` : ""}.{" "}
        <a href={`https://www.linkedin.com/jobs/view/${encodeURIComponent(vaga.jobId)}/`} target="_blank" rel="noopener noreferrer">
          Abrir no LinkedIn
        </a>
      </p>

      <p>
        {adaptada ? (
          <Link href={`/vagas/${adaptada}`}>Ver o currículo adaptado a esta vaga</Link>
        ) : (
          <Link href={`/vagas/nova?jobId=${encodeURIComponent(vaga.jobId)}`}>Criar currículo adaptado a esta vaga</Link>
        )}
      </p>

      <h2>Histórico de Status</h2>
      <ol className="historico">
        {vaga.historico.map((e, i) => (
          <li key={i} style={corDe(e.status)}>
            {ROTULO[e.status]}
            <time dateTime={e.em.toISOString()}>{formatarDataHora(e.em)}</time>
          </li>
        ))}
      </ol>

      <h2>Descrição</h2>
      {vaga.descricao ? (
        <p className="descricao">{vaga.descricao}</p>
      ) : (
        <p className="suave">O bot não guardou a descrição desta vaga.</p>
      )}
    </>
  );
}

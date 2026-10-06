import Link from "next/link";
import { notFound } from "next/navigation";
import { repositorioCandidaturas } from "../../../candidaturas/pool";
import { repositorioMestre } from "../../../mestre/pool";
import { repositorioVagas } from "../../../vagas/pool";
import { repositorioExportacoes } from "../../../exportar/pool";
import { carregarEstado } from "../../../revisao/carregar";
import { coberturaAtual } from "../../../revisao/estado";
import { analisarDeNovo } from "../acoes";
import { formatarDataHora } from "../../formatar";
import { Estado } from "../estado";
import { Acompanhar } from "./acompanhar";
import { Excluir } from "./excluir";

export const dynamic = "force-dynamic";

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
      {vaga.geracao && <UltimoPdf vagaId={id} />}

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
  // a cobertura já considera os ajustes da Revisão (itens ocultados, itens criados)
  const estado = carregarEstado(geracao.revisao, await (await repositorioMestre()).ler(), geracao.selecao);
  const cobertura = coberturaAtual(estado, vaga.requisitos!, geracao.selecao.cobertura);
  const lacunas = cobertura.filter((c) => c.itens === 0).length;

  return (
    <>
      <p className="suave">
        Seleção {geracao.numero}, feita pelo modelo {geracao.modelo}{geracao.revisao ? ", com ajustes seus" : ""}. Nada foi escrito pela IA: é só o que já está no seu mestre.
      </p>
      <p><Link className="principal" href={`/vagas/${vaga.id}/revisao`}>{geracao.revisao ? "Continuar a revisão" : "Revisar e ajustar a seleção"}</Link></p>

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
    </>
  );
}

async function UltimoPdf({ vagaId }: { vagaId: number }) {
  const [ultimo] = await (await repositorioExportacoes()).listar(vagaId);
  return (
    <>
      <h2>PDF</h2>
      {ultimo ? (
        <p>
          Último PDF: {ultimo.paginas} {ultimo.paginas === 1 ? "página" : "páginas"}, exportado em {formatarDataHora(ultimo.exportadaEm)}.{" "}
          <a href={`/vagas/${vagaId}/exportar/pdf?exportacao=${ultimo.id}`}>Baixar</a>. <Link href={`/vagas/${vagaId}/exportar`}>Exportar de novo</Link>
        </p>
      ) : (
        <p className="suave">Ainda não exportado. Depois de revisar, <Link href={`/vagas/${vagaId}/exportar`}>exporte o PDF</Link>.</p>
      )}
    </>
  );
}

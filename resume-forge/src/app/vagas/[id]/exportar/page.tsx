import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resumirExportacao } from "../../../../exportar/resumo";
import { repositorioExportacoes } from "../../../../exportar/pool";
import { repositorioMestre } from "../../../../mestre/pool";
import { carregarEstado } from "../../../../revisao/carregar";
import { repositorioVagas } from "../../../../vagas/pool";
import { formatarDataHora } from "../../../formatar";
import { BotaoExportar } from "./botao-exportar";

export const dynamic = "force-dynamic";

export default async function Exportar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ geracao?: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const geracaoPedida = Number((await searchParams).geracao) || undefined;

  const repo = await repositorioVagas();
  const vaga = await repo.obter(id, geracaoPedida);
  if (!vaga) notFound();
  if (!vaga.geracao || !vaga.requisitos || vaga.estado === "analisando") redirect(`/vagas/${id}`);

  const mestre = await (await repositorioMestre()).ler();
  const estado = carregarEstado(vaga.geracao.revisao, mestre, vaga.geracao.selecao);
  const resumo = resumirExportacao(mestre, estado, vaga.requisitos, vaga.geracao.selecao.cobertura);
  const exportacoes = await (await repositorioExportacoes()).listar(id);
  const geracoes = new Map((await repo.listarGeracoes(id)).map((g) => [g.id, g.numero]));
  const sufixo = geracaoPedida ? `?geracao=${geracaoPedida}` : "";

  return (
    <>
      <Link className="voltar" href={`/vagas/${id}/revisao${sufixo}`}>Voltar à revisão</Link>
      <h1>Exportar PDF</h1>
      <p className="suave">{vaga.titulo || "Vaga sem título"}{vaga.empresa && <>, {vaga.empresa}</>}. Seleção {vaga.geracao.numero}{vaga.geracao.revisao ? ", com os seus ajustes" : ""}.</p>

      <h2>Antes de exportar</h2>
      <ul className="conferencia">
        <li>
          <strong>{resumo.requisitos.cobertos} de {resumo.requisitos.total}</strong> requisitos cobertos.
          {resumo.lacunas.length > 0 ? (
            <> Lacunas não impedem a exportação:
              <ul>{resumo.lacunas.map((l) => <li key={l.id}><mark>{l.texto}</mark></li>)}</ul>
            </>
          ) : " Nenhuma lacuna."}
        </li>
        <li>
          {resumo.ocultos.length === 0 ? "Nenhum item do mestre ficou de fora." : (
            <details>
              <summary><strong>{resumo.ocultos.length}</strong> {resumo.ocultos.length === 1 ? "item do mestre ficou" : "itens do mestre ficaram"} de fora</summary>
              <ul>{resumo.ocultos.map((o, i) => <li key={i}><span className="suave">{o.secao}:</span> {o.texto}</li>)}</ul>
            </details>
          )}
        </li>
        {resumo.contatoIncompleto.length > 0 && (
          <li className="aviso-texto">Faltam no cabeçalho do PDF: {resumo.contatoIncompleto.join(", ")}. <Link href="/mestre/contato">Completar o contato</Link></li>
        )}
        <li>Mais de 2 páginas bloqueiam a exportação. O número vale o do PDF de verdade, que é contado ao gerar.</li>
      </ul>

      <BotaoExportar vagaId={id} geracaoId={vaga.geracao.id} />

      <h2>PDFs exportados</h2>
      {exportacoes.length === 0 ? (
        <p className="suave">Nenhum ainda.</p>
      ) : (
        <table className="lista">
          <caption className="sr-only">PDFs exportados desta vaga, do mais recente ao mais antigo</caption>
          <thead><tr><th scope="col">Exportado em</th><th scope="col">Páginas</th><th scope="col">Seleção</th><th scope="col">Arquivo</th></tr></thead>
          <tbody>
            {exportacoes.map((e, i) => (
              <tr key={e.id}>
                <td>{formatarDataHora(e.exportadaEm)}{i === 0 && <span className="etiqueta bom">mais recente</span>}</td>
                <td>{e.paginas}</td>
                <td>{geracoes.get(e.geracaoId) ?? "removida"}</td>
                <td><a href={`/vagas/${id}/exportar/pdf?exportacao=${e.id}`}>{e.arquivo}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="ajuda">
        {vaga.jobId
          ? <>Esta vaga está ligada à candidatura do LinkedIn {vaga.jobId}: o bot anexa o PDF mais recente quando a candidatura for enviada.</>
          : <>Esta vaga não está ligada a uma candidatura do LinkedIn, então o bot não a usa. Crie a vaga a partir de uma candidatura do painel para ligá-las.</>}
      </p>
    </>
  );
}

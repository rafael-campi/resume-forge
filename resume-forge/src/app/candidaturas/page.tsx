import Link from "next/link";
import { repositorioCandidaturas } from "../../candidaturas/pool";
import { STATUS } from "../../candidaturas/tipos";
import type { Status } from "../../candidaturas/tipos";
import { haQuanto, ROTULO } from "../formatar";
import { corDe } from "../status";

// Lê o banco a cada acesso: o bot grava a qualquer momento.
export const dynamic = "force-dynamic";

type Params = { status?: string; busca?: string };

function href({ status, busca }: { status?: Status; busca?: string }) {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (busca) q.set("busca", busca);
  const texto = q.toString();
  return texto ? `/candidaturas?${texto}` : "/candidaturas";
}

export default async function Candidaturas({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const status = STATUS.find((s) => s === params.status);
  const busca = params.busca?.trim() || undefined;

  const repo = repositorioCandidaturas();
  const [resumo, { linhas, total }] = await Promise.all([repo.resumo(), repo.listar({ status, busca })]);
  const geral = STATUS.reduce((soma, s) => soma + resumo[s], 0);
  const agora = new Date();
  const filtrando = Boolean(status || busca);

  return (
    <>
      <div className="cabecalho">
        <h1>Candidaturas</h1>
        <span className="suave">{geral} {geral === 1 ? "vaga registrada" : "vagas registradas"} pelo bot</span>
      </div>

      <nav aria-label="Candidaturas por Status">
        <div className="faixa" aria-hidden="true">
          {STATUS.filter((s) => resumo[s] > 0).map((s) => (
            <span key={s} style={{ ...corDe(s), flex: resumo[s], background: "var(--cor)" }} />
          ))}
        </div>
        <ul className="funil">
          {STATUS.map((s) => (
            <li key={s}>
              <Link href={href({ status: s, busca })} style={corDe(s)} aria-current={status === s ? "page" : undefined}>
                <span className="n">{resumo[s]}</span>
                <span className="rotulo">{ROTULO[s]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form className="busca" role="search" action="/candidaturas">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="sr-only" htmlFor="busca">Buscar por título ou empresa</label>
        <input id="busca" type="search" name="busca" defaultValue={busca} placeholder="Título ou empresa" />
        <button type="submit">Buscar</button>
        {filtrando && <Link className="limpar" href="/candidaturas">Limpar filtros</Link>}
      </form>

      {linhas.length === 0 ? (
        <div className="vazio">
          {filtrando ? (
            <>
              <p>Nenhuma candidatura com esses filtros.</p>
              <p className="suave">Limpe a busca ou escolha outro Status.</p>
            </>
          ) : (
            <>
              <p>O bot ainda não registrou nenhuma vaga.</p>
              <p className="suave">Rode <code>python main.py</code> em <code>apply-jobs</code> para buscar vagas.</p>
            </>
          )}
        </div>
      ) : (
        <table className="lista">
          <caption className="sr-only">Candidaturas, da mais recente para a mais antiga</caption>
          <thead>
            <tr>
              <th scope="col">Vaga</th>
              <th scope="col">Status</th>
              <th scope="col">Atualizada</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.jobId}>
                <td>
                  <Link className="titulo" href={`/candidaturas/${encodeURIComponent(l.jobId)}`}>{l.titulo}</Link>
                  <div className="suave">{l.empresa}{l.local ? `, ${l.local}` : ""}</div>
                </td>
                <td>
                  <span className="selo" style={corDe(l.status)}>{ROTULO[l.status]}</span>
                </td>
                <td className="quando">{haQuanto(l.atualizadaEm, agora)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {total > linhas.length && (
        <p className="rodape">Mostrando as {linhas.length} mais recentes de {total}. Refine a busca para ver as outras.</p>
      )}
    </>
  );
}

import Link from "next/link";
import { repositorioVagas } from "../../vagas/pool";
import { Estado } from "./estado";

export const dynamic = "force-dynamic";

export default async function Vagas() {
  const vagas = await (await repositorioVagas()).listar();
  return (
    <>
      <div className="cabecalho">
        <h1>Vagas</h1>
        <Link className="principal" href="/vagas/nova">Nova vaga</Link>
      </div>
      {vagas.length === 0 ? (
        <div className="vazio">
          <p>Nenhuma vaga ainda.</p>
          <p className="suave">Cole o texto de uma vaga e a IA escolhe o que do seu currículo mestre mostrar.</p>
        </div>
      ) : (
        <table className="lista">
          <caption className="sr-only">Vagas, da mais recente para a mais antiga</caption>
          <thead>
            <tr><th scope="col">Vaga</th><th scope="col">Situação</th><th scope="col">Criada em</th></tr>
          </thead>
          <tbody>
            {vagas.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link className="titulo" href={`/vagas/${v.id}`}>{v.titulo || "Vaga sem título"}</Link>
                  {v.empresa && <div className="suave">{v.empresa}</div>}
                </td>
                <td><Estado estado={v.estado} /></td>
                <td className="quando">{v.criadaEm.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

import Link from "next/link";
import { completude } from "../../mestre/completude";
import { SECOES } from "../../mestre/esquema";
import { repositorioMestre } from "../../mestre/pool";
import { ROTULO_SECAO } from "../../mestre/secoes";

export const dynamic = "force-dynamic";

export default async function VisaoGeral() {
  const c = completude(await (await repositorioMestre()).ler());
  const obrigatorias = SECOES.filter((s) => c[s].obrigatoria);
  const prontas = obrigatorias.filter((s) => c[s].completa).length;
  const pendentes = SECOES.filter((s) => !c[s].completa);

  return (
    <>
      <h1>Currículo mestre</h1>
      <p className="suave">
        É a fonte da verdade: a IA só escolhe e ordena o que está aqui, e nunca escreve nem reescreve. Tudo é salvo sozinho.
      </p>
      <p>
        <strong>{prontas} de {obrigatorias.length}</strong> seções obrigatórias completas.
      </p>
      {pendentes.length === 0 ? (
        <p>Nada pendente. Você pode seguir para as vagas.</p>
      ) : (
        <ul className="pendencias">
          {pendentes.map((s) => (
            <li key={s}>
              <Link href={`/mestre/${s}`}>{ROTULO_SECAO[s]}</Link>
              <ul>{c[s].pendencias.map((p) => <li key={p}>{p}</li>)}</ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

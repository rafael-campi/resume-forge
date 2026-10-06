import Link from "next/link";
import { redirect } from "next/navigation";
import { repositorioCandidaturas } from "../../../candidaturas/pool";
import { paraItensMestre } from "../../../mestre/itens";
import { repositorioMestre } from "../../../mestre/pool";
import { repositorioVagas } from "../../../vagas/pool";
import { FormularioVaga } from "./formulario";

export const dynamic = "force-dynamic";

export default async function NovaVaga({ searchParams }: { searchParams: Promise<{ jobId?: string }> }) {
  const { jobId } = await searchParams;
  let previa = { titulo: "", empresa: "", texto: "", jobId: "" };

  if (jobId) {
    // Veio de uma candidatura do bot: se já há vaga para ela, abre; senão, preenche com o que o bot guardou.
    const existente = await (await repositorioVagas()).porJobId(jobId);
    if (existente) redirect(`/vagas/${existente}`);
    const doBot = await repositorioCandidaturas().detalhe(jobId).catch(() => null);
    if (doBot) previa = { titulo: doBot.titulo, empresa: doBot.empresa, texto: doBot.descricao, jobId };
  }

  const itens = paraItensMestre(await (await repositorioMestre()).ler());
  const mestrePronto = itens.resumos.length > 0 && itens.experiencias.some((e) => e.bullets.length > 0);

  return (
    <>
      <Link className="voltar" href="/vagas">Voltar às vagas</Link>
      <h1>Nova vaga</h1>
      <p className="suave">Cole o texto da vaga. A IA extrai os requisitos e escolhe o que do seu currículo mestre mostrar, sem escrever nada novo.</p>
      {!mestrePronto && (
        <p className="aviso" role="note">
          O currículo mestre ainda não tem um resumo e uma experiência com bullets, então a IA não terá o que escolher.{" "}
          <Link href="/mestre">Completar o mestre</Link>
        </p>
      )}
      <FormularioVaga previa={previa} />
    </>
  );
}

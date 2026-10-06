import { notFound } from "next/navigation";
import { SECOES } from "../../../mestre/esquema";
import type { Secao } from "../../../mestre/esquema";
import { repositorioMestre } from "../../../mestre/pool";
import { Editor } from "./editor";

export const dynamic = "force-dynamic";

export default async function PaginaSecao({ params }: { params: Promise<{ secao: string }> }) {
  const { secao } = await params;
  if (!(SECOES as readonly string[]).includes(secao)) notFound();
  const mestre = await (await repositorioMestre()).ler();
  // key: ao trocar de seção o editor recomeça com os dados dela
  return <Editor key={secao} secao={secao as Secao} mestreInicial={mestre} />;
}

import { notFound, redirect } from "next/navigation";
import { repositorioMestre } from "../../../../mestre/pool";
import { carregarEstado } from "../../../../revisao/carregar";
import { repositorioVagas } from "../../../../vagas/pool";
import { Revisao } from "./revisao";

export const dynamic = "force-dynamic";

export default async function PaginaRevisao({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ geracao?: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const geracaoPedida = Number((await searchParams).geracao) || undefined;

  const repo = await repositorioVagas();
  const vaga = await repo.obter(id, geracaoPedida);
  if (!vaga) notFound();
  // sem seleção para revisar (ainda analisando, ou nunca deu certo): a página da vaga mostra o andamento ou o erro
  if (!vaga.geracao || !vaga.requisitos || vaga.estado === "analisando") redirect(`/vagas/${id}`);

  const mestre = await (await repositorioMestre()).ler();
  const geracoes = await repo.listarGeracoes(id);

  return (
    <Revisao
      key={vaga.geracao.id} // outra geração = outra tela do zero: senão o estado de uma seria salvo na outra
      vaga={{ id, titulo: vaga.titulo, empresa: vaga.empresa }}
      geracao={{ id: vaga.geracao.id, numero: vaga.geracao.numero }}
      geracoes={geracoes.map((g) => ({ ...g, criadaEm: g.criadaEm.toISOString() }))}
      ehAtual={geracoes[0]?.id === vaga.geracao.id}
      requisitos={vaga.requisitos}
      selecaoIA={vaga.geracao.selecao}
      mestreInicial={mestre}
      estadoInicial={carregarEstado(vaga.geracao.revisao, mestre, vaga.geracao.selecao)}
    />
  );
}

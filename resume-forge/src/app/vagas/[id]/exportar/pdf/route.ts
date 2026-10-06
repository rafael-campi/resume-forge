import { repositorioExportacoes } from "../../../../../exportar/pool";

export const dynamic = "force-dynamic";

/** Baixa um PDF exportado desta vaga: /vagas/N/exportar/pdf?exportacao=ID */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const vagaId = Number((await params).id);
  const exportacaoId = Number(new URL(req.url).searchParams.get("exportacao"));
  if (!Number.isInteger(vagaId) || !Number.isInteger(exportacaoId)) return new Response("Pedido inválido.", { status: 400 });

  const repo = await repositorioExportacoes();
  const exportacao = (await repo.listar(vagaId)).find((e) => e.id === exportacaoId); // só os PDFs desta vaga
  const pdf = exportacao && (await repo.pdf(exportacaoId));
  if (!exportacao || !pdf) return new Response("PDF não encontrado.", { status: 404 });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportacao.arquivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

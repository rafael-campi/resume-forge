"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { analisarVaga } from "../../vagas/analisar";
import { depsDeAnalise, repositorioVagas } from "../../vagas/pool";
import { extrairJobId } from "../../vagas/tipos";

/** Roda a análise depois de responder: leva de 1 a 2 minutos, e a tela da vaga acompanha. */
function analisarEmSegundoPlano(id: number) {
  after(async () => {
    try {
      await analisarVaga(await depsDeAnalise(), id);
    } catch (erro) {
      console.error(`Não consegui iniciar a análise da vaga ${id}:`, erro);
    }
  });
}

/** Em erro, devolve também o que foi digitado: o React zera os campos depois de uma ação. */
export type EstadoFormulario = { erro: string; valores: Record<"titulo" | "empresa" | "jobId" | "texto", string> } | null;

export async function criarVaga(_anterior: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const campo = (nome: string) => String(dados.get(nome) ?? "");
  const valores = { titulo: campo("titulo"), empresa: campo("empresa"), jobId: campo("jobId"), texto: campo("texto") };
  const texto = valores.texto.trim();
  if (texto.length < 30) return { erro: "Cole o texto completo da vaga (pelo menos 30 caracteres).", valores };

  const entradaJobId = valores.jobId.trim();
  const jobId = extrairJobId(entradaJobId);
  if (entradaJobId && !jobId) return { erro: "Não reconheci esse link ou ID do LinkedIn. Cole o link da vaga ou só os números do ID.", valores };

  const repo = await repositorioVagas();
  const existente = jobId ? await repo.porJobId(jobId) : null;
  if (existente) redirect(`/vagas/${existente}`);

  const id = await repo.criar({ titulo: valores.titulo.trim(), empresa: valores.empresa.trim(), texto, jobId });
  analisarEmSegundoPlano(id);
  redirect(`/vagas/${id}`);
}

export async function analisarDeNovo(id: number) {
  await (await repositorioVagas()).iniciarAnalise(id);
  analisarEmSegundoPlano(id);
  revalidatePath(`/vagas/${id}`);
}

export async function excluirVaga(id: number) {
  await (await repositorioVagas()).excluir(id);
  redirect("/vagas");
}

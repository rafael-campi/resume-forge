import { z } from "zod";

const item = z.object({ id: z.string().min(1), visivel: z.boolean() });

/** Valida o que o navegador manda para guardar (e o que foi guardado antes). */
export const esquemaEstadoRevisao = z.object({
  resumo: z.string(),
  experiencias: z.array(item.extend({ bullets: z.array(item) })),
  projetos: z.array(item),
  skills: z.array(item),
  novos: z.array(z.string()),
  coberturaManual: z.record(z.string(), z.array(z.string())),
});

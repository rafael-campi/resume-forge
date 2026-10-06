"use client";

import { useActionState } from "react";
import { criarVaga } from "../acoes";

type Previa = { titulo: string; empresa: string; texto: string; jobId: string };

export function FormularioVaga({ previa }: { previa: Previa }) {
  const [estado, enviar, pendente] = useActionState(criarVaga, null);
  const inicial = estado?.valores ?? previa; // o que foi digitado sobrevive a um erro de validação
  return (
    <form action={enviar} className="formulario-vaga">
      <div className="campos">
        <div className="campo">
          <label htmlFor="titulo">Título (opcional)</label>
          <input id="titulo" name="titulo" type="text" defaultValue={inicial.titulo} />
        </div>
        <div className="campo">
          <label htmlFor="empresa">Empresa (opcional)</label>
          <input id="empresa" name="empresa" type="text" defaultValue={inicial.empresa} />
        </div>
        <div className="campo campo-largo">
          <label htmlFor="jobId">Link ou ID da vaga no LinkedIn (opcional)</label>
          <input id="jobId" name="jobId" type="text" defaultValue={inicial.jobId} aria-describedby="jobId-ajuda" />
          <p id="jobId-ajuda" className="ajuda">Liga esta vaga à candidatura do bot, para o currículo adaptado chegar a ela.</p>
        </div>
        <div className="campo campo-largo">
          <label htmlFor="texto">Texto da vaga</label>
          <textarea id="texto" name="texto" rows={14} required defaultValue={inicial.texto} aria-describedby="texto-ajuda" />
          <p id="texto-ajuda" className="ajuda">Este texto e o conteúdo do seu currículo mestre vão para a IA (NVIDIA Build). Seu nome e seu contato nunca vão.</p>
        </div>
      </div>
      {estado?.erro && <p className="erro-form" role="alert">{estado.erro}</p>}
      <button type="submit" className="principal" disabled={pendente}>{pendente ? "Criando…" : "Analisar vaga"}</button>
    </form>
  );
}

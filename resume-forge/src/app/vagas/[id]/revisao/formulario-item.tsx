"use client";

import { useId, useState } from "react";
import type { EntradaNovoItem } from "../../../../revisao/novoItem";
import { criarItem } from "./acoes";

type Opcao = { id: string; rotulo: string };
type Props = {
  tipo: "bullet" | "projeto" | "skill";
  /** Para bullets: em qual experiência. Uma só opção = fixa; várias = a pessoa escolhe. */
  experiencias?: Opcao[];
  /** Quando o item nasce de uma lacuna, o requisito que ele pretende cobrir. */
  requisito?: string;
  onCriado: (entrada: EntradaNovoItem, id: string) => void;
  onCancelar: () => void;
};

const ROTULO = { bullet: "Adicionar bullet", projeto: "Adicionar projeto", skill: "Adicionar skill" } as const;

export function FormularioItem({ tipo, experiencias = [], requisito, onCriado, onCancelar }: Props) {
  const uid = useId();
  const [experienciaId, setExperienciaId] = useState(experiencias[0]?.id ?? "");
  const [texto, setTexto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tags, setTags] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = tags.split(",");
    const entrada: EntradaNovoItem =
      tipo === "bullet" ? { tipo, experienciaId, texto, tags: t }
      : tipo === "projeto" ? { tipo, nome: texto, descricao, tags: t }
      : { tipo, nome: texto, categoria, tags: t };
    setEnviando(true);
    setErro(null);
    const r = await criarItem(entrada).catch(() => ({ ok: false as const, erro: "Sem conexão com o servidor." }));
    setEnviando(false);
    if (r.ok) onCriado(entrada, r.id);
    else setErro(r.erro);
  }

  const rotuloTexto = tipo === "bullet" ? "Texto do bullet" : tipo === "projeto" ? "Nome do projeto" : "Skill";
  return (
    <form className="novo-item" onSubmit={enviar} aria-label={ROTULO[tipo]}>
      {tipo === "bullet" && experiencias.length > 1 && (
        <div className="campo">
          <label htmlFor={`${uid}-exp`}>Em qual experiência</label>
          <select id={`${uid}-exp`} value={experienciaId} onChange={(e) => setExperienciaId(e.target.value)}>
            {experiencias.map((x) => <option key={x.id} value={x.id}>{x.rotulo}</option>)}
          </select>
        </div>
      )}
      <div className="campo">
        <label htmlFor={`${uid}-t`}>{rotuloTexto}</label>
        {tipo === "bullet"
          ? <textarea id={`${uid}-t`} rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
          : <input id={`${uid}-t`} type="text" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />}
        {requisito && <p className="ajuda">Escreva só se for verdade: ele é salvo no seu mestre e passa a cobrir “{requisito}”.</p>}
      </div>
      {tipo === "projeto" && (
        <div className="campo">
          <label htmlFor={`${uid}-d`}>Descrição</label>
          <textarea id={`${uid}-d`} rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
      )}
      {tipo === "skill" && (
        <div className="campo">
          <label htmlFor={`${uid}-c`}>Categoria (opcional)</label>
          <input id={`${uid}-c`} type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        </div>
      )}
      <div className="campo">
        <label htmlFor={`${uid}-g`}>Tags (opcional)</label>
        <input id={`${uid}-g`} type="text" value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>
      {erro && <p className="erro-form" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="submit" className="principal" disabled={enviando}>{enviando ? "Salvando…" : ROTULO[tipo]}</button>
        <button type="button" className="adicionar" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

"use client";

import { excluirVaga } from "../acoes";

export function Excluir({ id }: { id: number }) {
  return (
    <form action={excluirVaga.bind(null, id)} onSubmit={(e) => { if (!window.confirm("Excluir esta vaga e as seleções da IA? Não há como desfazer.")) e.preventDefault(); }}>
      <button type="submit" className="remover">Excluir vaga</button>
    </form>
  );
}

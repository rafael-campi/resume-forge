"use client";

import { useState, useTransition } from "react";
import type { Importado } from "../../../importacao/linkedin";
import { ROTULO_SECAO } from "../../../mestre/secoes";
import type { Secao } from "../../../mestre/esquema";
import { analisarPerfil, importarPerfil } from "./acoes";
import type { Previa } from "./acoes";

export function Importador() {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string[] | null>(null);
  const [telefone, setTelefone] = useState("");
  const [ocupado, iniciar] = useTransition();

  const analisar = (dados: FormData) =>
    iniciar(async () => {
      setErro(null); setFeito(null); setPrevia(null);
      const r = await analisarPerfil(dados);
      if (r.ok) setPrevia(r.previa); else setErro(r.erro);
    });

  const importar = (importado: Importado) =>
    iniciar(async () => {
      const tel = telefone.trim();
      const r = await importarPerfil(tel ? { ...importado, contato: { ...importado.contato, telefone: tel } } : importado);
      if (r.ok) { setFeito(r.secoes); setPrevia(null); } else setErro(r.erro);
    });

  const totalNovos = (previa ? Object.values(previa.mesclagem).reduce((n, s) => n + (s?.novos ?? 0), 0) : 0) + (telefone.trim() ? 1 : 0);

  return (
    <div className="importador">
      <form action={analisar} className="busca">
        <input type="file" name="pdf" accept="application/pdf" required aria-label="PDF do perfil do LinkedIn" />
        <button type="submit" disabled={ocupado}>{ocupado && !previa ? "Lendo…" : "Ler PDF"}</button>
      </form>

      {erro && <p role="alert" className="erro">{erro}</p>}

      {feito && (
        <p role="status">
          {feito.length === 0 ? "Nada de novo para importar." : `Importado em: ${feito.map((s) => ROTULO_SECAO[s as Secao]).join(", ")}.`} Confira as seções ao lado.
        </p>
      )}

      {previa && (
        <>
          <h2>O que encontrei</h2>
          {(Object.keys(previa.itens) as string[]).filter((s) => previa.itens[s]!.length).map((s) => {
            const m = previa.mesclagem[s as Secao];
            return (
              <section key={s}>
                <h3>
                  {ROTULO_SECAO[s as Secao]}{" "}
                  <span className="suave">
                    — {m?.novos ?? 0} {s === "contato" ? "campo(s) a preencher" : "novo(s)"}
                    {m?.existentes ? `, ${m.existentes} já existia(m)` : ""}
                  </span>
                </h3>
                <ul>{previa.itens[s]!.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </section>
            );
          })}
          <div className="campo">
            <label htmlFor="telefone">Telefone (o PDF do LinkedIn não traz)</label>
            <input id="telefone" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Opcional; só preenche se o mestre estiver sem telefone" />
          </div>
          <button type="button" disabled={ocupado || totalNovos === 0} onClick={() => importar(previa.importado)}>
            {totalNovos === 0 ? "Nada de novo para importar" : ocupado ? "Importando…" : `Importar ${totalNovos} item(ns) para o mestre`}
          </button>
        </>
      )}
    </div>
  );
}

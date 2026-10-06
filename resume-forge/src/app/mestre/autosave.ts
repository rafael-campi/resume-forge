"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type EstadoSalvar = { tipo: "salvo" } | { tipo: "pendente" } | { tipo: "salvando" } | { tipo: "erro"; mensagem: string };
type Resultado = { ok: true } | { ok: false; erros: string[] };

/**
 * Salva `valor` depois de uma pausa na digitação. Ao sair da página com algo pendente,
 * salva na hora e avisa o navegador. A primeira renderização não dispara salvamento.
 */
export function useAutosave<T>(valor: T, salvar: (v: T) => Promise<Resultado>, atrasoMs = 700) {
  const [estado, setEstado] = useState<EstadoSalvar>({ tipo: "salvo" });
  const primeira = useRef(true);
  const ultimo = useRef(valor);
  const sujo = useRef(false);
  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;

  const enviar = useCallback(async () => {
    sujo.current = false;
    setEstado({ tipo: "salvando" });
    try {
      const r = await salvarRef.current(ultimo.current);
      if (!r.ok) {
        sujo.current = true;
        setEstado({ tipo: "erro", mensagem: r.erros.join("; ") });
      } else if (!sujo.current) setEstado({ tipo: "salvo" });
    } catch {
      sujo.current = true;
      setEstado({ tipo: "erro", mensagem: "sem conexão com o servidor" });
    }
  }, []);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    ultimo.current = valor;
    sujo.current = true;
    setEstado({ tipo: "pendente" });
    const t = setTimeout(enviar, atrasoMs);
    return () => clearTimeout(t);
  }, [valor, atrasoMs, enviar]);

  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => {
      if (sujo.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", avisar);
    return () => {
      window.removeEventListener("beforeunload", avisar);
      if (sujo.current) void salvarRef.current(ultimo.current); // saiu da seção antes da pausa
    };
  }, []);

  return { estado, tentarDeNovo: enviar };
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Folha } from "./folha";
import type { CurriculoFinal } from "./montar";

const MARGEM_MM = 18;
const ALTURA_UTIL_MM = 297 - 2 * MARGEM_MM; // área de texto de uma página A4

/** Quantos pixels CSS tem `mm` milímetros neste navegador. */
function mmParaPx(mm: number): number {
  const sonda = document.createElement("div");
  sonda.style.cssText = `position:absolute;visibility:hidden;height:${mm}mm;width:1px`;
  document.body.appendChild(sonda);
  const px = sonda.offsetHeight;
  sonda.remove();
  return px;
}

export type Medida = { fracao: number; paginas: number };

/**
 * A folha em tamanho real, reduzida para caber na coluna, e a medida do texto em páginas.
 * É uma estimativa feita com o mesmo HTML do PDF; o número final vem do PDF gerado.
 */
export function FolhaMedida({ curriculo, onMedida }: { curriculo: CurriculoFinal; onMedida: (m: Medida) => void }) {
  const conteudo = useRef<HTMLDivElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const [fracao, setFracao] = useState(1);
  const [escala, setEscala] = useState(0.6);
  const [altura, setAltura] = useState(0);
  const aviso = useRef(onMedida);
  aviso.current = onMedida;

  useLayoutEffect(() => {
    if (!conteudo.current) return;
    const f = conteudo.current.offsetHeight / mmParaPx(ALTURA_UTIL_MM);
    setFracao(f);
    aviso.current({ fracao: f, paginas: Math.max(1, Math.ceil(f - 0.001)) });
  }, [curriculo]);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ajustar = () => setEscala(Math.min(1, el.clientWidth / mmParaPx(210)));
    ajustar();
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useLayoutEffect(() => {
    setAltura(Math.max(mmParaPx(297), conteudo.current ? conteudo.current.offsetHeight + mmParaPx(2 * MARGEM_MM) : 0) * escala);
  }, [curriculo, escala]);

  const quebras = Array.from({ length: Math.max(1, Math.ceil(fracao - 0.001)) }, (_, i) => i + 1).filter((i) => i === 1 || i < fracao);

  return (
    <div ref={caixa} className="folha-caixa" style={{ height: altura || undefined }} aria-label="Pré-visualização do currículo">
      <div className="folha-escala" style={{ transform: `scale(${escala})` }}>
        <Folha c={curriculo} conteudoRef={conteudo} />
        {quebras.map((i) => (
          <div key={i} className="quebra" style={{ top: `${MARGEM_MM + ALTURA_UTIL_MM * i}mm` }} aria-hidden="true">
            <span>Fim da página {i}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

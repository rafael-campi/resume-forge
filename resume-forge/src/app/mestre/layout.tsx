import Link from "next/link";
import type { ReactNode } from "react";
import { completude } from "../../mestre/completude";
import { SECOES } from "../../mestre/esquema";
import { repositorioMestre } from "../../mestre/pool";
import { ROTULO_SECAO } from "../../mestre/secoes";

export const dynamic = "force-dynamic";

export default async function LayoutMestre({ children }: { children: ReactNode }) {
  const c = completude(await (await repositorioMestre()).ler());
  return (
    <div className="mestre">
      <nav className="secoes" aria-label="Seções do currículo mestre">
        <ul>
          {SECOES.map((s) => (
            <li key={s}>
              <Link href={`/mestre/${s}`}>
                <span>{ROTULO_SECAO[s]}</span>
                <span className="estado" data-estado={c[s].completa ? "ok" : c[s].obrigatoria ? "falta" : "opcional"}>
                  {c[s].completa ? (c[s].obrigatoria ? "Completa" : "Opcional") : "Pendente"}
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/mestre/importar"><span>Importar do LinkedIn</span></Link>
          </li>
        </ul>
      </nav>
      <div className="conteudo">{children}</div>
    </div>
  );
}

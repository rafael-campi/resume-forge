import type { Ref } from "react";
import type { CurriculoFinal } from "./montar";
import "./folha.css";

/** Link clicável sem depender de o texto vir com "https://". */
const href = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export function Folha({ c, conteudoRef }: { c: CurriculoFinal; conteudoRef?: Ref<HTMLDivElement> }) {
  const ct = c.contato;
  const partes: React.ReactNode[] = [
    ct.cidade,
    ct.email && <a key="e" href={`mailto:${ct.email}`}>{ct.email}</a>,
    ct.telefone,
    ct.linkedin && <a key="l" href={href(ct.linkedin)}>{ct.linkedin}</a>,
    ct.github && <a key="g" href={href(ct.github)}>{ct.github}</a>,
    ct.site && <a key="s" href={href(ct.site)}>{ct.site}</a>,
  ].filter(Boolean);

  return (
    <article className="folha">
      <div ref={conteudoRef}>
        <header>
          <h1 className="nome">{ct.nome || <span className="vazio-folha">Seu nome</span>}</h1>
          <p className="contato">
            {partes.map((p, i) => <span key={i}>{i > 0 && " · "}{p}</span>)}
          </p>
        </header>

        {c.resumo && <section><h2>Resumo</h2><p>{c.resumo}</p></section>}

        {c.skills.length > 0 && (
          <section>
            <h2>Skills</h2>
            {c.skills.map((l) => <p key={l.categoria}><strong>{l.categoria}:</strong> {l.nomes.join(", ")}</p>)}
          </section>
        )}

        {c.experiencias.length > 0 && (
          <section>
            <h2>Experiência</h2>
            {c.experiencias.map((e, i) => (
              <div key={i}>
                <div className="linha-cargo">
                  <span><strong>{e.empresa}</strong>{e.cargo && <> · {e.cargo}</>}</span>
                  <span className="datas">{e.periodo}</span>
                </div>
                {e.bullets.length > 0 && <ul>{e.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>}
              </div>
            ))}
          </section>
        )}

        {c.projetos.length > 0 && (
          <section>
            <h2>Projetos</h2>
            {c.projetos.map((p, i) => (
              <p key={i}><strong>{p.nome}</strong>{p.link && <> (<a href={href(p.link)}>{p.link}</a>)</>}{p.descricao && <>: {p.descricao}</>}</p>
            ))}
          </section>
        )}

        {c.formacao.length > 0 && (
          <section>
            <h2>Formação</h2>
            {c.formacao.map((f, i) => (
              <div key={i} className="linha-cargo">
                <span><strong>{f.instituicao}</strong>{f.curso && <> · {f.curso}</>}</span>
                <span className="datas">{f.periodo}</span>
              </div>
            ))}
          </section>
        )}

        {c.idiomas.length > 0 && (
          <section>
            <h2>Idiomas</h2>
            <p>{c.idiomas.map((i) => (i.nivel ? `${i.idioma} (${i.nivel})` : i.idioma)).join(", ")}</p>
          </section>
        )}
      </div>
    </article>
  );
}

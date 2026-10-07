import { Importador } from "./importador";

export default function Importar() {
  return (
    <>
      <h1>Importar do LinkedIn</h1>
      <p className="suave">
        No LinkedIn: seu perfil → <strong>Recursos</strong> (ou <strong>Mais</strong>) → <strong>Salvar como PDF</strong>. Suba o arquivo aqui.
        A leitura roda só nesta máquina, sem IA, e nada é enviado a ninguém.
      </p>
      <p className="suave">
        Nada do que você já escreveu é apagado nem alterado: só entram itens novos, e o contato só preenche campos vazios.
        Depois confira tudo nas seções: o PDF não traz telefone, e as descrições viram bullets do jeito que estão no LinkedIn.
      </p>
      <Importador />
    </>
  );
}

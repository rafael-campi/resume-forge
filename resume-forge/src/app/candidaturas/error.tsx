"use client";

export default function ErroDeLeitura({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="vazio" role="alert">
      <p>Não foi possível ler as candidaturas.</p>
      <p className="suave">
        Confira se o Postgres está no ar (<code>docker compose up -d db</code> em <code>apply-jobs</code>) e se
        <code> DATABASE_URL</code> aponta para ele. Detalhe: {error.message}
      </p>
      <button className="limpar" onClick={reset}>Tentar de novo</button>
    </div>
  );
}

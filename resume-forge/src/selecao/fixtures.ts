import type { ItensMestre, Requisito } from "./tipos";

// Dados inventados (sem nome nem contato).
export const itens: ItensMestre = {
  resumos: [
    { id: "s1", texto: "Desenvolvedor backend com 6 anos de experiência." },
    { id: "s2", texto: "Desenvolvedor full stack com 6 anos de experiência." },
  ],
  experiencias: [
    {
      id: "e1",
      titulo: "Alfa Logística · Dev Backend · 2022–atual",
      bullets: [
        { id: "b1", texto: "Reduzi a latência p95 das APIs de 800ms para 220ms." },
        { id: "b2", texto: "Migrei serviços para ECS com deploy contínuo." },
        { id: "b3", texto: "Liderei a squad de 4 devs.", sempreVisivel: false },
      ],
    },
    {
      id: "e2",
      titulo: "Beta Commerce · Dev Full Stack · 2019–2022",
      bullets: [{ id: "b5", texto: "Construí o checkout em React e Node.js." }],
    },
  ],
  projetos: [
    { id: "p1", texto: "API de reservas open source." },
    { id: "p2", texto: "Bot de Telegram para gastos." },
  ],
  skills: [
    { id: "k1", texto: "TypeScript" },
    { id: "k2", texto: "Node.js" },
    { id: "k3", texto: "Python" },
  ],
};

export const requisitos: Requisito[] = [
  { id: "r1", texto: "Node.js e TypeScript em APIs REST" },
  { id: "r2", texto: "AWS (ECS, Lambda)" },
  { id: "r3", texto: "Kubernetes em produção" },
];

export const selecaoBoa = {
  resumo: "s1",
  experiencias: [{ id: "e1", bullets: ["b2", "b1"] }],
  projetos: ["p1"],
  skills: ["k1", "k2"],
  cobertura: { b1: ["r1"], b2: ["r2"], k1: ["r1"] },
  lacunas: ["r3"],
};

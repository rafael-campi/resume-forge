// JSON Schemas enviados à IA via response_format (docs/spec/mvp.md, 4.1 e 4.5).
const listaDeIds = { type: "array", items: { type: "string" } };

export const SCHEMA_REQUISITOS = {
  type: "object",
  additionalProperties: false,
  required: ["requisitos"],
  properties: {
    requisitos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "texto"],
        properties: { id: { type: "string" }, texto: { type: "string" } },
      },
    },
  },
};

export const SCHEMA_SELECAO = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "experiencias", "projetos", "skills", "cobertura", "lacunas"],
  properties: {
    resumo: { type: "string" },
    experiencias: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "bullets"],
        properties: { id: { type: "string" }, bullets: listaDeIds },
      },
    },
    projetos: listaDeIds,
    skills: listaDeIds,
    cobertura: { type: "object", additionalProperties: listaDeIds },
    lacunas: listaDeIds,
  },
};

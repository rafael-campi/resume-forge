import { obterPool } from "../db/pool";
import { criarRepositorioCandidaturas } from "./repositorio";

// As tabelas são do bot e ele as migra; o resume-forge só lê.
export const repositorioCandidaturas = () => criarRepositorioCandidaturas(obterPool());

/** IDs estáveis, gerados uma vez quando o item é criado. Sem dependências: roda no navegador. */
export const novoId = (prefixo: string) => `${prefixo}_${crypto.randomUUID().slice(0, 8)}`;

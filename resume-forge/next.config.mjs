/** @type {import('next').NextConfig} */
export default {
  // Têm binários e carregamento dinâmico: ficam fora do bundle e rodam direto do node_modules.
  serverExternalPackages: ["playwright", "playwright-core", "pdf-lib"],
};

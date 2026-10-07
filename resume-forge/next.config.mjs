/** @type {import('next').NextConfig} */
export default {
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  // Têm binários e carregamento dinâmico: ficam fora do bundle e rodam direto do node_modules.
  serverExternalPackages: ["playwright", "playwright-core", "pdf-lib", "pdfjs-dist"],
};

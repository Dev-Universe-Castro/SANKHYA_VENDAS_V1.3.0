import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente do config.env.local
const result = config({ path: resolve(__dirname, 'config.env.local') });

if (result.error) {
  console.error('❌ Erro ao carregar config.env.local:', result.error);
} else {
  console.log('✅ Variáveis carregadas do config.env.local:', Object.keys(result.parsed || {}).length);
}

import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: false, // Sempre ativo para funcionar offline
  register: true,
  skipWaiting: true,
  workboxOptions: {
    disableDevLogs: true,
    // Adicionar rotas principais para precache
    additionalManifestEntries: [
      { url: '/dashboard', revision: null },
      { url: '/dashboard/parceiros', revision: null },
      { url: '/dashboard/produtos', revision: null },
      { url: '/dashboard/leads', revision: null },
      { url: '/dashboard/pedidos', revision: null },
      { url: '/dashboard/financeiro', revision: null },
      { url: '/dashboard/calendario', revision: null },
      { url: '/dashboard/chat', revision: null },
      { url: '/dashboard/analise', revision: null },
      { url: '/dashboard/equipe', revision: null },
      { url: '/dashboard/usuarios', revision: null },
      { url: '/dashboard/configuracoes', revision: null },
      { url: '/offline', revision: null },
    ],
    // Estratégia offline-first: cachear todas as páginas durante instalação
    runtimeCaching: [
      // Offline-supported Pages - NetworkFirst
      {
        urlPattern: /\/dashboard\/(?:parceiros|produtos|pedidos|configuracoes|politicas)/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'dashboard-offline-pages',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Online-only Pages - NetworkOnly
      {
        urlPattern: /\/dashboard\/(?:rotas|tarefas)/,
        handler: 'NetworkOnly',
      },
      // HTML Pages - CacheFirst (Remaining pages)
      {
        urlPattern: ({ request }) => request.destination === 'document',
        handler: 'CacheFirst',
        options: {
          cacheName: 'pages-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
          // Atualizar cache em background quando online
          plugins: [
            {
              cacheDidUpdate: async ({ cacheName, request }) => {
                console.log(`✅ Página atualizada no cache: ${request.url}`)
              },
            },
          ],
        },
      },
      // Scripts e CSS - CacheFirst
      {
        urlPattern: /\.(?:js|css)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-resources',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
          },
        },
      },
      // Imagens - CacheFirst
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 24 * 60 * 60, // 60 dias
          },
        },
      },
      // Fontes - CacheFirst
      {
        urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'fonts-cache',
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 ano
          },
        },
      },
      // API - NetworkFirst com fallback para dados em cache
      {
        urlPattern: /\/api\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 5 * 60, // 5 minutos
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Next.js internals - CacheFirst
      {
        urlPattern: /^\/_next\/.*/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-cache',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Não usar basePath para evitar duplicação de rotas
  output: 'standalone',
  // Excluir módulos do servidor do bundle do cliente
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Excluir redis e outros módulos do servidor do bundle do cliente
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        dns: false,
        fs: false,
        redis: false,
        'node:assert': false,
        'node:buffer': false,
        'node:crypto': false,
        'node:events': false,
        'node:stream': false,
        'node:util': false,
      };

      // Ignorar módulos do Redis completamente no cliente
      config.externals = config.externals || [];
      config.externals.push({
        redis: 'commonjs redis',
        '@redis/client': 'commonjs @redis/client',
        '@redis/bloom': 'commonjs @redis/bloom',
        '@redis/json': 'commonjs @redis/json',
        '@redis/search': 'commonjs @redis/search',
        '@redis/time-series': 'commonjs @redis/time-series',
      });
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://crescimentoerp.nuvemdatacom.com.br:5000',
    SANKHYA_TOKEN: process.env.SANKHYA_TOKEN,
    SANKHYA_APPKEY: process.env.SANKHYA_APPKEY,
    SANKHYA_USERNAME: process.env.SANKHYA_USERNAME,
    SANKHYA_PASSWORD: process.env.SANKHYA_PASSWORD,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://crescimentoerp.nuvemdatacom.com.br:5000'
  },
  // Garantir que as URLs sejam geradas corretamente
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Otimizações de performance
  swcMinify: true,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Silenciar logs do Fast Refresh
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  // Reduzir logging em desenvolvimento
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Silenciar compilações em desenvolvimento
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,
    pagesBufferLength: 10,
  },
  // Reduzir output de compilação
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    optimizeCss: true,
    // Otimizações para alta concorrência
    cpus: 2,
    workerThreads: true,
    instrumentationHook: true,
    // Otimizações adicionais
    serverMinification: true,
  },
  // Cache agressivo
  cacheMaxMemorySize: 100 * 1024 * 1024, // 100MB
  // Compressão agressiva
  compress: true,
  generateEtags: true,
  // Otimizações de compilação
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Configurações de cache agressivo para múltiplos usuários
  onDemandEntries: {
    maxInactiveAge: 120 * 1000, // 2 minutos
    pagesBufferLength: 10, // Mais páginas em cache
  },
  // Headers de cache otimizados
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_SITE_URL || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Cookie, Set-Cookie' },
        ],
      },
    ];
  },
}

export default withPWA(nextConfig);
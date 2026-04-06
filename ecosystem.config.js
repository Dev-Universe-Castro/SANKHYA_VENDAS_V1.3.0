const path = require('path');
// Carrega as variáveis do arquivo local para memória
require('dotenv').config({ path: path.join(__dirname, 'config.env.local') });

module.exports = {
  apps : [{
    name: "SankhyaVendas",
    // Aponta para o servidor otimizado (Standalone)
    script: ".next/standalone/server.js",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 5000,
      HOSTNAME: "0.0.0.0",

      // === CORREÇÃO CRÍTICA (Conexão Local) ===
      // Define explicitamente localhost para evitar sair pelo firewall e ser bloqueado
      ORACLE_CONNECT_STRING: "localhost:1521/FREEPDB1",
      
      // Credenciais do Banco
      ORACLE_USER: process.env.ORACLE_USER || "SYSTEM",
      ORACLE_PASSWORD: process.env.ORACLE_PASSWORD, // Pega do config.env.local

      // Variáveis da API Sankhya e IA
      SANKHYA_TOKEN: process.env.SANKHYA_TOKEN,
      SANKHYA_APPKEY: process.env.SANKHYA_APPKEY,
      SANKHYA_USERNAME: process.env.SANKHYA_USERNAME,
      SANKHYA_PASSWORD: process.env.SANKHYA_PASSWORD,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      
      // URL do Site
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
    }
  }]
};

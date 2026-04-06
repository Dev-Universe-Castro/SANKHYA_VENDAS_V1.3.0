"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, MapIcon, TrendingUp, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function LandingPage() {
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#121212] flex flex-col overflow-x-hidden">
      <SiteHeader />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative min-h-screen flex items-center pt-20 pb-20 overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('/Fundo site.png')" }}>
          {/* Overlay para legibilidade */}
          <div className="absolute inset-0 bg-[#1E5128]/40 backdrop-blur-[2px] z-0" />
          
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#76BA1B]/20 blur-[80px] pointer-events-none z-10" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[30rem] h-[30rem] rounded-full bg-[#1E5128]/10 blur-[100px] pointer-events-none z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                <motion.div variants={fadeInUp} className="inline-flex items-center px-4 py-2 rounded-full bg-[#76BA1B]/20 border border-[#76BA1B]/30 text-sm font-bold text-white mb-8 shadow-lg backdrop-blur-sm">
                  <span className="flex h-2 w-2 rounded-full bg-[#76BA1B] mr-2"></span>
                  Inteligência Artificial para Vendas B2B
                </motion.div>

                <motion.h1 variants={fadeInUp} className="text-4xl md:text-5xl lg:text-7xl font-black font-montserrat tracking-tight text-white mb-6 leading-tight drop-shadow-md">
                  Força de Vendas <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#76BA1B]">Integrada e Inteligente</span>
                </motion.h1>

                <motion.p variants={fadeInUp} className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-sm">
                  Acelere seus negócios com roteirização inteligente, mix de produtos estratégico e integração nativa com o seu ERP Sankhya.
                </motion.p>

                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/login">
                    <Button size="lg" className="h-14 px-8 text-base bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-full shadow-lg shadow-[#76BA1B]/30 hover:shadow-[#1E5128]/20 transition-all w-full sm:w-auto gap-2 group">
                      Acessar o Sistema
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/funcionalidades">
                    <Button size="lg" variant="outline" className="h-14 px-8 text-base border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full w-full sm:w-auto">
                      Ver Funcionalidades
                    </Button>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* VITRINE / ACESSO RÁPIDO */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-[#76BA1B] font-bold tracking-wider uppercase text-sm mb-3">Descubra o PredictSales</h2>
              <h3 className="text-3xl md:text-4xl font-bold font-montserrat text-[#1E5128]">Tudo o que você precisa saber</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link href="/funcionalidades" className="group">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-[#1E5128]/5 group-hover:bg-[#1E5128]/10 text-[#1E5128] flex items-center justify-center mb-6 transition-colors">
                    <MapIcon className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-bold mb-3 group-hover:text-[#76BA1B] transition-colors">Funcionalidades</h4>
                  <p className="text-gray-500 text-sm mb-4">Rotas, check-in, políticas comerciais offline e controle absoluto.</p>
                  <span className="text-[#1E5128] font-bold text-sm mt-auto flex items-center group-hover:translate-x-1 transition-transform">Ler mais <ArrowRight className="ml-1 w-4 h-4" /></span>
                </div>
              </Link>

              <Link href="/ia" className="group">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-[#76BA1B]/10 group-hover:bg-[#76BA1B]/20 text-[#76BA1B] flex items-center justify-center mb-6 transition-colors">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-bold mb-3 group-hover:text-[#76BA1B] transition-colors">Modo IA</h4>
                  <p className="text-gray-500 text-sm mb-4">Assistente virtual inteligente, predição de giro e Cross-Sell automático.</p>
                  <span className="text-[#1E5128] font-bold text-sm mt-auto flex items-center group-hover:translate-x-1 transition-transform">Ler mais <ArrowRight className="ml-1 w-4 h-4" /></span>
                </div>
              </Link>

              <Link href="/integracao-sankhya" className="group">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-gray-900 group-hover:bg-black text-white flex items-center justify-center mb-6 transition-colors">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-bold mb-3 group-hover:text-[#76BA1B] transition-colors">ERP Sankhya</h4>
                  <p className="text-gray-500 text-sm mb-4">Sincronismo perfeito de impostos (ST/IPI), limites de crédito e descontos.</p>
                  <span className="text-[#1E5128] font-bold text-sm mt-auto flex items-center group-hover:translate-x-1 transition-transform">Ler mais <ArrowRight className="ml-1 w-4 h-4" /></span>
                </div>
              </Link>

              <Link href="/planos" className="group">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-[#1E5128]/5 group-hover:bg-[#1E5128]/10 text-[#1E5128] flex items-center justify-center mb-6 transition-colors">
                    <TrendingUp className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-bold mb-3 group-hover:text-[#76BA1B] transition-colors">Orçamentos</h4>
                  <p className="text-gray-500 text-sm mb-4">Soluções sob medida desenhadas para o tamanho da sua operação.</p>
                  <span className="text-[#1E5128] font-bold text-sm mt-auto flex items-center group-hover:translate-x-1 transition-transform">Ver agora <ArrowRight className="ml-1 w-4 h-4" /></span>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
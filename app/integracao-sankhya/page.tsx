"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { motion } from "framer-motion";
import { CheckCircle2, Lock, Combine, Server, Repeat, Network, Database, Smartphone } from "lucide-react";
import Image from "next/image";

export default function SankhyaPage() {
    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col overflow-x-hidden">
            <SiteHeader />

            <main className="flex-1">

                {/* HERO ARQUITETURA */}
                <section className="relative min-h-screen flex items-center bg-gray-900 text-white pt-24 pb-20 overflow-hidden border-b border-gray-800">
                    <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    {/* Fundo "Matrix" / Tech */}
                    <div className="absolute right-0 top-0 w-1/2 h-full opacity-10">
                        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#76BA1B" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="flex flex-col lg:flex-row gap-12 items-center">
                            <div className="lg:w-3/5">
                                <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
                                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#76BA1B]/20 border border-[#76BA1B]/30 text-xs font-mono text-[#76BA1B] mb-6 uppercase tracking-widest">
                                        <Server className="w-4 h-4 mr-2" /> Integração Técnica ERP Sankhya
                                    </div>
                                    <h1 className="text-5xl md:text-6xl font-black font-montserrat mb-6 leading-tight">
                                        O Motor Perfeito para <br />
                                        <span className="text-[#76BA1B]">SankhyaW®</span>
                                    </h1>
                                    <p className="text-xl text-gray-400 leading-relaxed mb-10 max-w-2xl font-light">
                                        O aplicativo PredictSales foi desenhado por arquitetos especialistas no banco de dados do Sankhya. Excluímos camadas desnecessárias de middleware para prover sincronismo nativo bidirecional ("Sync Delta") de altíssima fidelidade.
                                    </p>

                                    <div className="flex gap-4 items-center font-mono text-sm text-gray-500">
                                        <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-green-500" /> AES-256 JWT</span>
                                        <span className="flex items-center gap-2"><Combine className="w-4 h-4 text-green-500" /> Multi-Empresa</span>
                                        <span className="flex items-center gap-2"><Repeat className="w-4 h-4 text-green-500" /> Sync Delta</span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Diagrama Esquemático Animado */}
                            <div className="lg:w-2/5 w-full">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    className="bg-black/50 p-6 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm"
                                >
                                    <div className="flex flex-col items-center gap-6">
                                        {/* Sankhya Block */}
                                        <div className="w-full bg-gray-800 border-2 border-gray-700 py-4 px-6 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Database className="text-white" /> <span className="font-bold font-mono text-xl">Sankhya DB</span>
                                            </div>
                                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">Oracle / SQL Server</span>
                                        </div>

                                        {/* Bridge */}
                                        <div className="flex flex-col items-center gap-2 py-2 relative">
                                            <div className="w-1 h-12 bg-gradient-to-b from-gray-700 to-[#76BA1B] relative">
                                                <div className="absolute top-0 left-[-4px] w-3 h-3 bg-white rounded-full animate-bounce"></div>
                                            </div>
                                            <div className="text-[#76BA1B] text-xs font-bold uppercase tracking-widest bg-black px-4 py-1 rounded-full border border-[#76BA1B]/30 z-10 absolute top-1/2 -translate-y-1/2">
                                                PredictSales Sync Engine
                                            </div>
                                            <div className="w-1 h-12 bg-gradient-to-t from-gray-700 to-[#76BA1B] relative"></div>
                                        </div>

                                        {/* App Block */}
                                        <div className="w-full bg-[#1E5128]/20 border-2 border-[#1E5128] py-4 px-6 rounded-xl flex items-center justify-between">
                                            <span className="text-xs bg-[#76BA1B]/20 text-[#76BA1B] px-2 py-1 rounded font-mono">Mobile App</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold font-mono text-xl text-[#76BA1B]">PredictSales SQLite</span> <Smartphone className="text-[#76BA1B]" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* DETALHAMENTO DE TABELAS */}
                <section className="py-24 bg-white relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-[#76BA1B] font-bold tracking-wider uppercase text-sm mb-3">Mapeamento Direto</h2>
                            <h3 className="text-3xl md:text-5xl font-black font-montserrat text-gray-900 mb-6">Nós falamos a linguagem do seu ERP</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                Nós não 'mapeamos nomes'. O PredictSales reproduz integralmente a lógica de tabelas do Sankhya para que a sua TI não precise fazer nenhum "de-para". Veja o espelho primário de entidades que sincronizamos:
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Card Produto */}
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-gray-50 border border-gray-200 rounded-3xl p-8 hover:shadow-xl transition-shadow">
                                <div className="flex gap-4 items-center mb-6">
                                    <div className="p-3 bg-blue-100 text-blue-700 rounded-xl"><Database className="w-6 h-6" /></div>
                                    <h4 className="text-2xl font-bold font-montserrat text-gray-900">Módulo de Produtos</h4>
                                </div>
                                <p className="text-gray-600 mb-6 font-light">Sincronizamos todos os cadastros mestres e estoques reais baseados nos locais permitidos para cada empresa/vendedor.</p>
                                <div className="flex flex-wrap gap-3">
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFPRO (Produtos)</span>
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFEST (Estoque)</span>
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFBAR (Cód. Barras)</span>
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFVOL (Volumes)</span>
                                </div>
                            </motion.div>

                            {/* Card Clientes */}
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-gray-50 border border-gray-200 rounded-3xl p-8 hover:shadow-xl transition-shadow">
                                <div className="flex gap-4 items-center mb-6">
                                    <div className="p-3 bg-purple-100 text-purple-700 rounded-xl"><Network className="w-6 h-6" /></div>
                                    <h4 className="text-2xl font-bold font-montserrat text-gray-900">Módulo de Parceiros</h4>
                                </div>
                                <p className="text-gray-600 mb-6 font-light">Gestão de contatos, avalistas, bloqueios financeiros, perfis corporativos e saldo de limite de crédito real.</p>
                                <div className="flex flex-wrap gap-3">
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFPAR (Parceiros/Clientes)</span>
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFFIN (Títulos Financeiros)</span>
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFCAB (Cabeçalho Notas)</span>
                                </div>
                            </motion.div>

                            {/* Card Precos */}
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-gray-50 border border-gray-200 rounded-3xl p-8 hover:shadow-xl transition-shadow">
                                <div className="flex gap-4 items-center mb-6">
                                    <div className="p-3 bg-orange-100 text-orange-700 rounded-xl"><Combine className="w-6 h-6" /></div>
                                    <h4 className="text-2xl font-bold font-montserrat text-gray-900">Motor de Preços e Exceções</h4>
                                </div>
                                <p className="text-gray-600 mb-6 font-light">Identifica a empresa, o parceiro e o item, cruza as tabelas ativas e avalia quebras de preço complexas como B2B real.</p>
                                <div className="flex flex-wrap gap-3">
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFTAB (Tabelas Preço)</span>
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFEXC (Exceções de Regras)</span>
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFCUS (Custos / Margem)</span>
                                </div>
                            </motion.div>

                            {/* Card Vendedores */}
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-gray-50 border border-gray-200 rounded-3xl p-8 hover:shadow-xl transition-shadow">
                                <div className="flex gap-4 items-center mb-6">
                                    <div className="p-3 bg-green-100 text-[#1E5128] rounded-xl"><Lock className="w-6 h-6" /></div>
                                    <h4 className="text-2xl font-bold font-montserrat text-gray-900">Controles de Alçada (Sankhya)</h4>
                                </div>
                                <p className="text-gray-600 mb-6 font-light">Todas hierarquias (Supervisores &gt; Vendedores) e workflow de descontos baseados em regras do Gerente Sankhya.</p>
                                <div className="flex flex-wrap gap-3">
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFVEN (Vendedores)</span>
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TSIUSU (Acessos Padrão)</span>
                                    <span className="bg-white border border-gray-200 px-3 py-1 font-mono text-sm font-semibold text-gray-700 rounded shadow-sm">TGFPED (Workflow de Pedidos)</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Sync Delta feature */}
                <section className="py-24 bg-[#1E5128] text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col lg:flex-row items-center gap-16">
                            <div className="lg:w-1/2">
                                <h2 className="text-4xl font-black font-montserrat mb-6">Tecnologia Smart Sync-Delta</h2>
                                <p className="text-white/80 text-lg leading-relaxed mb-6">
                                    Nós sabemos que a infraestrutura no interior do país não passa de sinais EDGE/3G fracos ou satélite limitado.
                                </p>
                                <p className="text-white/80 text-lg leading-relaxed mb-8">
                                    Por isso o PredictSales NÃO DÁ UM "DOWNLOAD" em todo o banco novamente a cada clique. Nossa engenharia extrai o "Delta" (Apenas aquilo que mudou no servidor desde a última consulta, os IDs modificados por timestamp) empacotando numa compressão severa de JSON GZIP.
                                </p>
                                <ul className="space-y-4 font-mono text-sm bg-black/20 p-6 rounded-2xl">
                                    <li className="flex justify-between items-center"><span className="text-[#76BA1B]">Sincronização Inicial (Wi-fi):</span> <span>~45 MB</span></li>
                                    <li className="flex justify-between items-center"><span className="text-[#76BA1B]">Sync Delta Diário (Rua 3G):</span> <span>~120 KB</span></li>
                                    <li className="flex justify-between items-center"><span className="text-[#76BA1B]">Retenção de Bateria do Device:</span> <span className="text-green-300">Aprovado Nível A</span></li>
                                </ul>
                            </div>
                            <div className="lg:w-1/2">
                                {/* Abstract illustration */}
                                <div className="w-full h-80 bg-white/5 rounded-[3rem] border border-white/20 p-8 flex items-center justify-center relative overflow-hidden backdrop-blur-md">
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#76BA1B]/20 to-transparent"></div>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
                                        className="w-48 h-48 border-[20px] border-dashed border-[#76BA1B]/30 rounded-full flex items-center justify-center"
                                    >
                                        <motion.div
                                            animate={{ rotate: -360 }}
                                            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                                            className="w-24 h-24 border-[10px] border-dashed border-white/40 rounded-full"
                                        ></motion.div>
                                    </motion.div>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-3xl font-mono text-white tracking-widest">
                                        DELTA
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}

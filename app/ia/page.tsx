"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { motion } from "framer-motion";
import { BarChart3, Bot, BrainCircuit, CheckCircle2, Cpu, MessageSquare, Zap } from "lucide-react";
import Link from "next/link";

export default function IAPage() {
    const fadeInUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
    };

    return (
        <div className="min-h-screen bg-black font-sans text-white flex flex-col overflow-x-hidden selection:bg-[#76BA1B] selection:text-black">
            <SiteHeader />

            <main className="flex-1">

                {/* HERO IA */}
                <section className="relative min-h-screen flex items-center pt-24 pb-20 overflow-hidden">
                    <div className="absolute top-0 right-1/4 w-[40vw] h-[40vw] bg-[#76BA1B] rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-pulse"></div>
                    <div className="absolute bottom-0 left-1/4 w-[30vw] h-[30vw] bg-[#1E5128] rounded-full mix-blend-screen filter blur-[120px] opacity-40"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-4xl mx-auto">
                            <motion.div variants={fadeInUp} className="inline-flex items-center px-5 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-semibold text-[#76BA1B] mb-8 shadow-[0_0_20px_rgba(118,186,27,0.2)]">
                                <BrainCircuit className="w-5 h-5 mr-3" /> Motor Neural Preditivo v2.0
                            </motion.div>
                            <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-black font-montserrat mb-8 leading-tight tracking-tight">
                                Vendas alimentadas por <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#76BA1B] to-emerald-400">Inteligência Artificial</span>
                            </motion.h1>
                            <motion.p variants={fadeInUp} className="text-xl text-gray-400 leading-relaxed mb-12 max-w-3xl mx-auto font-light">
                                Não é apenas um sistema de recomendação básico. Nossa arquitetura analisa milhões de linhas do seu faturamento histórico no Sankhya para entregar insights cirúrgicos antes mesmo do vendedor fazer o check-in no cliente.
                            </motion.p>

                            <motion.div variants={fadeInUp} className="flex justify-center gap-6">
                                <div className="text-center px-6 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                                    <div className="text-3xl font-black text-white mb-1">+23%</div>
                                    <div className="text-xs text-green-400 uppercase tracking-wider font-bold">Aumento de Ticket Extra</div>
                                </div>
                                <div className="text-center px-6 py-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                                    <div className="text-3xl font-black text-white mb-1">-18%</div>
                                    <div className="text-xs text-red-400 uppercase tracking-wider font-bold">Queda em Churn rate</div>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* 1. ANALISTA DE DADOS VIRTUAL */}
                <section className="py-24 relative border-t border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col lg:flex-row gap-20 items-center">

                            <div className="lg:w-1/2 order-2 lg:order-1 relative">
                                <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative z-10">
                                    {/* Chat Mockup */}
                                    <div className="bg-[#0f0f0f] rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                                        <div className="border-b border-white/10 p-4 bg-white/5 flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <span className="text-xs text-gray-500 ml-4 font-mono">predict_ai_agent</span>
                                        </div>
                                        <div className="p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">

                                            {/* User prompt */}
                                            <div className="flex gap-4 items-start justify-end">
                                                <div className="bg-[#1E5128]/40 border border-[#76BA1B]/20 p-4 rounded-2xl rounded-tr-sm text-sm text-gray-300 max-w-[80%]">
                                                    Mostre as vendas de Cerveja Artesanal nos últimos 3 meses.
                                                </div>
                                            </div>

                                            {/* AI Thinking */}
                                            <div className="flex gap-2 items-center text-xs text-[#76BA1B] font-mono">
                                                <Cpu className="w-4 h-4 animate-spin" /> Consultando 14.5M registros Sankhya...
                                            </div>

                                            {/* AI Response */}
                                            <div className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-[#76BA1B] text-black flex items-center justify-center flex-shrink-0">
                                                    <Bot className="w-5 h-5" />
                                                </div>
                                                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl rounded-tl-sm w-full">
                                                    <p className="text-sm text-gray-300 mb-4">Aqui está o cruzamento focado em "Cerveja Artesanal" trimestral. <strong className="text-white">Notei uma queda de 12% atípica em Mai/Jun</strong> nos clientes do Cluster B.</p>
                                                    <div className="h-40 w-full flex items-end gap-2 px-2 mt-4">
                                                        {[{ h: "40%" }, { h: "55%" }, { h: "80%" }, { h: "90%" }, { h: "60%", color: "bg-red-500/80" }, { h: "50%", color: "bg-red-500/80" }].map((col, i) => (
                                                            <div key={i} className="flex-1 flex gap-1 items-end h-full group">
                                                                <div className={`w-full ${col.color || 'bg-[#76BA1B]'} rounded-t-md ${col.h} transition-all duration-500 hover:opacity-100 opacity-80 relative`}>
                                                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity bg-black px-2 py-1 rounded">R$ 1m</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            <div className="lg:w-1/2 order-1 lg:order-2">
                                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
                                    <h2 className="text-[#76BA1B] font-bold tracking-widest uppercase text-xs mb-4">AI Chat Analytics</h2>
                                    <h3 className="text-3xl md:text-5xl font-black font-montserrat mb-6">Converse com seu <br />Banco de Dados</h3>
                                    <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                        Chega de esperar a TI criar um dashboard ou exportar planilhas do banco. Os gestores usam a PredictSales AI para consultar o banco de dados em linguagem natural.
                                    </p>

                                    <ul className="space-y-6">
                                        <li className="flex gap-4">
                                            <div className="text-[#76BA1B] mt-1"><MessageSquare className="w-6 h-6" /></div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">Processamento de Linguagem Natural</h4>
                                                <p className="text-sm text-gray-500 mt-1">Lê perguntas normais como "Quem são os vendedores que bateram a meta de Sabão Líquido em MG?" e gera a query no Sankhya.</p>
                                            </div>
                                        </li>
                                        <li className="flex gap-4">
                                            <div className="text-[#76BA1B] mt-1"><BarChart3 className="w-6 h-6" /></div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">Gráficos Sem Código (Zero-Code)</h4>
                                                <p className="text-sm text-gray-500 mt-1">Gera visões em barras, linhas e tabelas complexas na hora, economizando dezenas de horas do analista comercial.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </motion.div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* 2. COPILOTO DO VENDEDOR (MIX) */}
                <section className="py-32 bg-[#0a0a0a] relative border-t border-b border-white/5 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-[radial-gradient(circle_at_center,rgba(118,186,27,0.05)_0%,transparent_70%)] pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-20">
                            <h2 className="text-[#76BA1B] font-bold tracking-widest uppercase text-xs mb-4">Copiloto em Campo</h2>
                            <h3 className="text-3xl md:text-5xl font-black font-montserrat mb-6">A magia do Carrinho Inteligente</h3>
                            <p className="text-gray-400 text-lg leading-relaxed">
                                Durante a visita, a IA atua silenciosamente injetando sugestões de compra com base nos clusters de clientes e histórico de positivação.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Card 1 */}
                            <motion.div whileHover={{ y: -10 }} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:border-[#76BA1B]/50 transition-colors group cursor-default">
                                <div className="h-16 w-16 bg-[#1E5128] rounded-2xl flex items-center justify-center text-[#76BA1B] mb-8 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(118,186,27,0.3)]">
                                    <Zap className="h-8 w-8 text-white" />
                                </div>
                                <h4 className="text-2xl font-bold mb-4 font-montserrat">Alerta de Churn</h4>
                                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                    Se um cliente compra "Refrigerante Cola 2L" toda semana, e fica 14 dias sem comprar, a IA sinaliza essa ruptura na tela principal antes do vendedor entrar no cliente, para que ele aborde o problema na prateleira.
                                </p>
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <span className="text-red-400 text-xs font-bold uppercase tracking-wider block mb-1">Risco Detectado</span>
                                    <span className="text-white text-sm font-medium">Queda drástica em Curva A</span>
                                </div>
                            </motion.div>

                            {/* Card 2 */}
                            <motion.div whileHover={{ y: -10 }} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:border-[#76BA1B]/50 transition-colors group cursor-default">
                                <div className="h-16 w-16 bg-[#1E5128] rounded-2xl flex items-center justify-center text-[#76BA1B] mb-8 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(118,186,27,0.3)]">
                                    <Bot className="h-8 w-8 text-white" />
                                </div>
                                <h4 className="text-2xl font-bold mb-4 font-montserrat">Cross-Selling Preciso</h4>
                                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                    "Clientes deste mesmo porte que levam Macarrão, têm 82% de chance de levar Molho de Tomate". A IA agrupa comportamentos por CNAE de clientes parecidos e sugere o complemento exato.
                                </p>
                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <span className="text-blue-400 text-xs font-bold uppercase tracking-wider block mb-1">Sugestão Cross-Sell</span>
                                    <span className="text-white text-sm font-medium">+ Molho de Tomate Sachê <span className="opacity-50 line-through">R$2,99</span> <span className="text-green-400">R$2,80</span></span>
                                </div>
                            </motion.div>

                            {/* Card 3 */}
                            <motion.div whileHover={{ y: -10 }} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:border-[#76BA1B]/50 transition-colors group cursor-default">
                                <div className="h-16 w-16 bg-[#1E5128] rounded-2xl flex items-center justify-center text-[#76BA1B] mb-8 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(118,186,27,0.3)]">
                                    <BrainCircuit className="h-8 w-8 text-white" />
                                </div>
                                <h4 className="text-2xl font-bold mb-4 font-montserrat">Histórico "Smart"</h4>
                                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                    Não mostramos apenas os últimos volumes fechados, geramos uma cesta automática chamada "Carrinho Sugerido" que já entra preenchida na quantidade ideal para quebrar o estoque atual baseado na previsão sazonal.
                                </p>
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                    <button className="w-full bg-[#76BA1B] text-black font-bold py-2 rounded-lg text-sm hover:bg-green-400 transition-colors">
                                        Adicionar Carrinho Sugerido
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* CTA IA */}
                <section className="py-24 bg-black text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E5128]/20 to-transparent"></div>
                    <div className="relative z-10">
                        <h3 className="text-3xl md:text-5xl font-black font-montserrat text-white mb-6">A evolução da sua força de vendas</h3>
                        <p className="text-gray-400 mb-10 text-lg">Habilite a Predictsales AI e assista seu Ticket Médio explodir no próximo trimestre.</p>
                        <Link href="/planos">
                            <button className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                Ver Planos Enterprise
                            </button>
                        </Link>
                    </div>
                </section>

            </main>

            <SiteFooter />
        </div>
    );
}

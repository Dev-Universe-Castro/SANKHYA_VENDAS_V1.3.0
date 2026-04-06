"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { motion } from "framer-motion";
import { ArrowDown, CheckCircle2, TrendingUp, Users, Database } from "lucide-react";
import Link from "next/link";

export default function SobrePage() {
    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7 } }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-[#121212] flex flex-col overflow-x-hidden">
            <SiteHeader />

            <main className="flex-1 mt-20">

                {/* HERO SOBRE A EMPRESA */}
                <section className="bg-gray-50 py-24 relative overflow-hidden border-b border-gray-100">
                    <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-gradient-to-bl from-[#76BA1B]/20 to-transparent rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="max-w-4xl mx-auto">
                            <h1 className="text-5xl md:text-7xl font-black font-montserrat mb-8 leading-tight text-[#1E5128]">
                                Tecnologia para quem <br /><span className="text-[#76BA1B]">vive na rua vendendo.</span>
                            </h1>
                            <p className="text-xl text-gray-600 leading-relaxed mb-12">
                                O PredictSales não foi idealizado dentro de um escritório fechado. Ele nasceu das dores reais de representantes comerciais que sofriam com planilhas lentas, erros de estoque e clientes insatisfeitos.
                            </p>
                            <div className="flex justify-center flex-wrap gap-8 text-left">
                                <div className="bg-white px-8 py-6 rounded-3xl shadow-lg border border-gray-100 min-w-[250px]">
                                    <div className="text-4xl font-black text-[#1E5128] mb-2">+10 Mi</div>
                                    <div className="text-gray-500 font-medium">Pedidos Processados Mensalmente</div>
                                </div>
                                <div className="bg-white px-8 py-6 rounded-3xl shadow-lg border border-gray-100 min-w-[250px]">
                                    <div className="text-4xl font-black text-[#76BA1B] mb-2">3.500+</div>
                                    <div className="text-gray-500 font-medium">Vendedores Ativos no Brasil</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* SEÇÃO O PROBLEMA VS A SOLUÇÃO */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">

                            {/* DOR */}
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-red-50 p-10 rounded-[3rem] border border-red-100">
                                <div className="text-red-600 font-bold mb-6 flex items-center uppercase tracking-widest text-sm">
                                    <span className="w-8 h-[2px] bg-red-600 mr-3"></span> O Passado (A Dor)
                                </div>
                                <h3 className="text-3xl font-black font-montserrat text-gray-900 mb-6">A Venda Cega</h3>
                                <p className="text-gray-700 text-lg leading-relaxed mb-6">
                                    Até hoje, muitas empresas enviam seus vendedores para clientes sem as informações corretas.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex gap-3 text-gray-600"><span className="text-red-500">❌</span> Ligar no depósito pra confirmar estoque.</li>
                                    <li className="flex gap-3 text-gray-600"><span className="text-red-500">❌</span> Vender para clientes bloqueados no financeiro (retrabalho).</li>
                                    <li className="flex gap-3 text-gray-600"><span className="text-red-500">❌</span> Aplicar descontos incorretos e prejudicar a margem do distribuidor.</li>
                                    <li className="flex gap-3 text-gray-600"><span className="text-red-500">❌</span> Vendedor como mero 'tirador de pedido' anotador num bloco.</li>
                                </ul>
                            </motion.div>

                            {/* SOLUÇÃO */}
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-[#1E5128] p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                                <div className="text-[#76BA1B] font-bold mb-6 flex items-center uppercase tracking-widest text-sm">
                                    <span className="w-8 h-[2px] bg-[#76BA1B] mr-3"></span> O Padrão PredictSales
                                </div>
                                <h3 className="text-3xl font-black font-montserrat mb-6">Consultoria Ativa</h3>
                                <p className="text-white/80 text-lg leading-relaxed mb-6">
                                    Nós entregamos um cérebro digital aos representantes. Uma ferramenta veloz e integrada ao Sankhya.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex gap-3 text-white/90"><span className="text-[#76BA1B]">✅</span> Tudo em um único app: Catálogo, rotas, finanças e CRM.</li>
                                    <li className="flex gap-3 text-white/90"><span className="text-[#76BA1B]">✅</span> Inteligência Artificial prevendo o que o cliente quer comprar antes de entrar na loja.</li>
                                    <li className="flex gap-3 text-white/90"><span className="text-[#76BA1B]">✅</span> Regras amarradas (o ERP é o coração, nada é faturado incorretamente).</li>
                                    <li className="flex gap-3 text-white/90"><span className="text-[#76BA1B]">✅</span> Fim do papel e planilhas de Excel.</li>
                                </ul>
                            </motion.div>

                        </div>
                    </div>
                </section>

                {/* NOSSOS PILARES TÉCNICOS E CULTURA */}
                <section className="py-24 bg-gray-50 border-t border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-[#76BA1B] font-bold tracking-wider uppercase text-sm mb-3">Filosofia</h2>
                            <h3 className="text-3xl md:text-4xl font-bold font-montserrat text-[#1E5128]">No que acreditamos fortemente</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div className="flex flex-col items-center text-center">
                                <div className="h-20 w-20 rounded-full bg-[#1E5128]/10 text-[#1E5128] flex items-center justify-center mb-6">
                                    <CheckCircle2 className="h-10 w-10" />
                                </div>
                                <h4 className="text-xl font-bold mb-4 font-montserrat">Obsessão pela Velocidade</h4>
                                <p className="text-gray-600 leading-relaxed">Vendedor no campo não tem tempo pra ficar olhando pro celular carregando("loading"). Menos cliques, menos telas, respostas imediatas. Interface minimalista voltada pra conversão de receita bruta pura.</p>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <div className="h-20 w-20 rounded-full bg-[#1E5128]/10 text-[#1E5128] flex items-center justify-center mb-6">
                                    <Database className="h-10 w-10" />
                                </div>
                                <h4 className="text-xl font-bold mb-4 font-montserrat">Verdade Única (Sankhya)</h4>
                                <p className="text-gray-600 leading-relaxed">Não acreditamos em sistemas paralelos. O ERP da empresa é a fonte da verdade de crédito e impostos. O ecossistema PredictSales foi construído sendo 100% amarrado na essência do Sankhya de forma bi-direcional.</p>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <div className="h-20 w-20 rounded-full bg-[#1E5128]/10 text-[#1E5128] flex items-center justify-center mb-6">
                                    <Users className="h-10 w-10" />
                                </div>
                                <h4 className="text-xl font-bold mb-4 font-montserrat">Dados Geram Comissão</h4>
                                <p className="text-gray-600 leading-relaxed">A IA não veio pra substituir o vendedor, veio pra lotar o bolso dele de comissão. Nós usamos a ciência de dados em toda sua elegância para fechar o "Gap de Oportunidades" que passaria batido.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Cta */}
                <section className="py-24 bg-white text-center">
                    <h3 className="text-4xl font-black font-montserrat text-[#1E5128] mb-6">Pronto para revolucionar seu comercial?</h3>
                    <p className="text-gray-500 mb-10 text-lg">Pare de gastar dinheiro com devoluções de mercadoria e ferramentas obsoletas.</p>
                    <Link href="/planos">
                        <button className="bg-[#76BA1B] hover:bg-[#1E5128] text-white px-10 py-4 rounded-full font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                            Conhecer os Planos
                        </button>
                    </Link>
                </section>

            </main>

            <SiteFooter />
        </div>
    );
}

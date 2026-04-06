"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { motion } from "framer-motion";
import { CheckCircle2, Map as MapIcon, WifiOff, Users, Calculator, ShieldCheck, Database, CalendarClock, Smartphone } from "lucide-react";
import Image from "next/image";

export default function FuncionalidadesPage() {
    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-[#121212] flex flex-col overflow-x-hidden">
            <SiteHeader />

            <main className="flex-1">

                {/* HERO FUNCIONALIDADES */}
                <section className="relative min-h-screen flex items-center bg-[#1E5128] text-white pt-24 pb-20 overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#76BA1B] rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-black rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="max-w-3xl mx-auto">
                            <motion.div variants={fadeInUp} className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-[#76BA1B] mb-6">
                                <span className="mr-2">⚙️</span> Ecossistema PredictSales
                            </motion.div>
                            <motion.h1 variants={fadeInUp} className="text-4xl md:text-6xl font-black font-montserrat mb-6 leading-tight">
                                Poder absoluto na <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#76BA1B] to-green-200">palma da mão</span>
                            </motion.h1>
                            <motion.p variants={fadeInUp} className="text-xl text-gray-300 leading-relaxed mb-10">
                                Transforme o celular do seu vendedor em uma máquina de vendas autônoma, projetada para alta performance em campo, com ou sem internet.
                            </motion.p>
                        </motion.div>
                    </div>
                </section>

                {/* Feature 1: OFFLINE FIRST */}
                <section className="py-24 bg-white relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col lg:flex-row items-center gap-16">
                            <div className="lg:w-1/2">
                                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
                                    <div className="h-16 w-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-red-100">
                                        <WifiOff className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-3xl md:text-4xl font-bold mb-6 font-montserrat text-[#1E5128]">
                                        Operação 100% Offline (Local-First)
                                    </h3>
                                    <p className="text-gray-600 text-lg leading-relaxed mb-6">
                                        A falta de sinal no interior ou em galpões industriais nunca mais será desculpa para perder vendas. A arquitetura Local-First do PredictSales armazena o banco de dados inteiro no banco de dados local do dispositivo.
                                    </p>
                                    <ul className="space-y-4">
                                        <li className="flex items-start bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <Database className="h-6 w-6 text-[#76BA1B] mr-4 flex-shrink-0" />
                                            <div>
                                                <h4 className="font-bold text-gray-900">Consulta Instantânea em Milissegundos</h4>
                                                <p className="text-sm text-gray-500 mt-1">Busque produtos entre mais de 30.000 itens instantaneamente. O app não precisa "pensar" conversando com o servidor.</p>
                                            </div>
                                        </li>
                                        <li className="flex items-start bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <Smartphone className="h-6 w-6 text-[#76BA1B] mr-4 flex-shrink-0" />
                                            <div>
                                                <h4 className="font-bold text-gray-900">Emissão de Pedidos no Escuro</h4>
                                                <p className="text-sm text-gray-500 mt-1">Calcule impostos, aplique promoções e feche o pedido. A sincronização (background sync) acontece magicamente assim que o 3G retornar.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </motion.div>
                            </div>

                            {/* MOCKUP VISUAL */}
                            <div className="lg:w-1/2 relative">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8 }}
                                    className="bg-gray-100 rounded-[2.5rem] p-6 shadow-2xl border-4 border-white relative z-10"
                                >
                                    <div className="absolute top-10 right-10 bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-2 z-20">
                                        <WifiOff className="w-3 h-3 text-red-400" /> Sem Conexão
                                    </div>
                                    <div className="bg-white rounded-3xl h-[450px] shadow-inner overflow-hidden flex flex-col border border-gray-200">
                                        {/* App Header Fake */}
                                        <div className="bg-[#1E5128] p-4 flex justify-between items-center text-white">
                                            <div className="font-bold">Novo Pedido</div>
                                            <div className="text-xs opacity-70">Sincronizando: Pausado</div>
                                        </div>
                                        {/* Lista Fake */}
                                        <div className="p-4 space-y-4 flex-1">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex gap-4 p-3 bg-gray-50 rounded-xl">
                                                    <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                                                        <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                                                        <div className="flex justify-between items-end mt-2">
                                                            <div className="text-sm font-bold text-[#1E5128]">R$ 45,90</div>
                                                            <div className="h-6 w-16 bg-[#76BA1B]/20 rounded-full border border-[#76BA1B]/30"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                                {/* Decoration blobs */}
                                <div className="absolute top-1/2 -right-10 w-32 h-32 bg-[#76BA1B]/20 rounded-full blur-2xl"></div>
                                <div className="absolute bottom-10 -left-10 w-40 h-40 bg-[#1E5128]/10 rounded-full blur-2xl"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature 2: CATÁLOGO E PRECIFICAÇÃO */}
                <section className="py-24 bg-gray-50 relative border-t border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                            <div className="lg:w-1/2">
                                <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}>
                                    <div className="h-16 w-16 bg-[#1E5128]/10 text-[#1E5128] rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-[#1E5128]/20">
                                        <Calculator className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-3xl md:text-4xl font-bold mb-6 font-montserrat text-[#1E5128]">
                                        Catálogo Digital e Motor de Regras Fiscais
                                    </h3>
                                    <p className="text-gray-600 text-lg leading-relaxed mb-6">
                                        Apresente seus produtos de forma profissional. O PredictSales suporta múltiplas fotos por produto, descrições ricas, categorias, grades (cor/tamanho) e até anexos em PDF (fichas técnicas).
                                    </p>

                                    <div className="space-y-6 mt-8">
                                        <div className="flex items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold mr-4">%</div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">Descontos em Cascata e Campanhas</h4>
                                                <p className="text-sm text-gray-500">Avaliação do volume de itens, promoções da indústria e exceções do cliente. Tudo em tempo real.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                                            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold mr-4">R$</div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">Cálculo de Impostos Nativos</h4>
                                                <p className="text-sm text-gray-500">Suporte a cálculos tributários pesados (ICMS-ST, IPI, FCP) de acordo com o NCM e a UF do cliente antes de fechar a cesta.</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Graphic / Image representation */}
                            <div className="lg:w-1/2">
                                <motion.div
                                    initial={{ opacity: 0, x: -50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8 }}
                                    className="grid grid-cols-2 gap-4"
                                >
                                    <div className="space-y-4 translate-y-8">
                                        <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
                                            <div className="h-32 bg-gray-100 rounded-xl mb-3"></div>
                                            <div className="h-4 w-2/3 bg-gray-800 rounded mb-2"></div>
                                            <div className="h-3 w-1/3 bg-gray-400 rounded"></div>
                                        </div>
                                        <div className="bg-[#1E5128] p-6 rounded-2xl shadow-lg text-white">
                                            <div className="text-sm opacity-80 mb-1">Total do Pedido</div>
                                            <div className="text-2xl font-black mb-4">R$ 14.500,00</div>
                                            <div className="flex justify-between text-xs border-t border-white/20 pt-2">
                                                <span>ST Rec.</span><span>R$ 450,00</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-[#76BA1B] p-6 rounded-2xl shadow-lg text-white">
                                            <div className="font-bold mb-2">Desconto Máximo</div>
                                            <div className="text-4xl font-black mb-1">12%</div>
                                            <div className="text-xs opacity-90">Liberado pelo Gerente</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100">
                                            <div className="h-40 bg-gray-100 rounded-xl mb-3 flex items-center justify-center text-gray-400">
                                                Galeria 3D
                                            </div>
                                            <div className="h-4 w-3/4 bg-gray-800 rounded"></div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature 3: CRM E ROTAS */}
                <section className="py-24 bg-white relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-20">
                            <h2 className="text-[#76BA1B] font-bold tracking-wider uppercase text-sm mb-3">CRM de Campo</h2>
                            <h3 className="text-3xl md:text-5xl font-black font-montserrat text-[#1E5128] mb-6">Visões 360º de cada cliente</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                Pare de perguntar "Como está sua carteira de clientes?". O PredictSales estrutura as visitas e exibe a saúde financeira da carteira em um dashboard intuitivo, organizando a rotina do representante.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#76BA1B] shadow-sm mb-6"><MapIcon /></div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">Rotas e Check-in GPS</h4>
                                <p className="text-gray-600 mb-6">Integração nativa com Google Maps e Waze. Roteirização por proximidade (Raio X) e registro de Check-in em tempo real com raio de validação (Anti-Fraude).</p>
                                <div className="w-full h-32 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=-23.5505,-46.6333&zoom=13&size=400x120&maptype=roadmap&markers=color:green%7Clabel:C%7C-23.5505,-46.6333&key=FAKEMAP')] bg-cover bg-center rounded-xl overflow-hidden border border-gray-200"></div>
                            </motion.div>

                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-[#1E5128] rounded-3xl p-8 shadow-xl text-white transform md:-translate-y-4">
                                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-[#76BA1B] mb-6"><Users /></div>
                                <h4 className="text-xl font-bold mb-3">Raio-X do Cliente</h4>
                                <p className="text-white/80 mb-6 font-light">
                                    Aba específica com tudo sobre o varejista: contatos, filiais, limite de crédito disponível, saldo em aberto e títulos vencidos que bloqueiam o Sankhya.
                                </p>
                                <div className="bg-white/10 rounded-xl p-4 divide-y divide-white/10">
                                    <div className="pb-2 flex justify-between"><span className="text-xs text-white/60">Rating</span> <span className="text-sm font-bold text-green-400">Classificação A</span></div>
                                    <div className="py-2 flex justify-between"><span className="text-xs text-white/60">Limite Compra</span> <span className="text-sm font-bold">R$ 50k</span></div>
                                    <div className="pt-2 flex justify-between"><span className="text-xs text-white/60">Em Aberto</span> <span className="text-sm font-bold text-red-300">R$ 1.200 (1 d)</span></div>
                                </div>
                            </motion.div>

                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#76BA1B] shadow-sm mb-6"><CalendarClock /></div>
                                <h4 className="text-xl font-bold text-gray-900 mb-3">Histórico e Reposição</h4>
                                <p className="text-gray-600 mb-6">Acesso total aos últimos 10 pedidos tirados para o cliente (inclusive status de faturamento do ERP), com botão "Copiar Pedido" para agilizar reposições rápidas.</p>
                                <div className="flex bg-white shadow-sm p-3 rounded-xl border border-gray-100 justify-between items-center cursor-pointer hover:border-green-500 transition-colors">
                                    <div>
                                        <div className="font-bold text-sm">Pedido #99214</div>
                                        <div className="text-xs text-gray-400">Há 7 dias - Faturado</div>
                                    </div>
                                    <div className="text-xs font-bold text-[#1E5128] uppercase">Clonar</div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* RECURSOS MENORES GRID */}
                <section className="py-24 bg-gray-900 text-white border-t border-gray-800 relative z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <h3 className="text-2xl font-bold font-montserrat mb-12 text-center">Muito mais que um tirador de pedidos.</h3>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {[
                                { title: "Metas Visuais", desc: "Acompanhamento diário das metas de receita, positivação e volume." },
                                { title: "Comissões", desc: "Demonstrativo em tempo real de comissões ganhas no mês." },
                                { title: "Trocas e Devoluções", desc: "Logística reversa integrada, registre RMA na visita." },
                                { title: "Políticas Dinâmicas", desc: "Bloqueia itens baseados na região atendida pelo vendedor." },
                                { title: "Gestão de Supervisores", desc: "Supervisores enxergam a rota dos seus liderados." },
                                { title: "Workflows de Aprovação", desc: "Estoure o desconto e o pedido cairá pra liberação do gerente." },
                                { title: "Leitor de Barras", desc: "Use a câmera nativa do celular para bipar produtos." },
                                { title: "Impressão Bluetooth", desc: "Conexão direta com mini-impressoras térmicas para canhotos." },
                            ].map((item, i) => (
                                <div key={i} className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                                    <h4 className="font-bold text-green-400 mb-2">{item.title}</h4>
                                    <p className="text-sm text-gray-400">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

            </main>

            <SiteFooter />
        </div>
    );
}

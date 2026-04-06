"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, HelpCircle, ChevronDown, Check, ArrowRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PlanosPage() {
    const [isAnnual, setIsAnnual] = useState(true);
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const faqs = [
        {
            q: "O sistema funciona em iPhones (iOS) ou apenas em Android?",
            a: "O PredictSales é um PWA (Progressive Web App) híbrido avançado, construído com as linguagens de ponta do mercado. Ele funciona perfeitamente tanto no ecossistema Android da Samsung/Motorola quanto nos iPhones da Apple. Não existem restrições de dispositivo."
        },
        {
            q: "O que acontece se meu vendedor perder o celular em uma região sem internet?",
            a: "O aplicativo possui proteção biométrica. O banco local (SQLite) onde os dados do Sankhya e as senhas encontram-se gravados é criptografado com chaves AES-256 bits via JWT. Nenhuma informação de margem de lucro, custo, ou faturamento dos clientes será acessível a terceiros."
        },
        {
            q: "Em quanto tempo o sistema PredictSales é implantado no meu distribuidor?",
            a: "Entre 7 a 14 dias úteis se a sua base do Sankhya estiver organizada. Nós instalamos a API bridge no servidor, validamos as visões e integramos o AD_CONTRATO automaticamente."
        },
        {
            q: "Tem limite de produtos, fotos ou clientes sincronizados no Offline?",
            a: "Não. O banco local suporta até dezenas de milhões de registros e mais de 2GB de cache de imagens sem engasgar o celular graças a nossa engine em Rust/WASM."
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col overflow-x-hidden">
            <SiteHeader />

            <main className="flex-1">

                {/* BUDGET REQUEST HERO */}
                <section className="relative min-h-screen flex items-center pt-24 pb-20 bg-white overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-gradient-to-b from-[#76BA1B]/10 to-transparent rounded-full blur-[120px] pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
                            <h1 className="text-4xl md:text-7xl font-black font-montserrat mb-8 tracking-tight text-[#1E5128] leading-tight">
                                Soluções Sob Medida para <br />o Seu Distribuidor
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-500 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
                                O PredictSales é uma plataforma robusta e altamente customizável. Trabalhamos com orçamentos personalizados baseados no seu volume de faturamento e complexidade operacional.
                            </p>

                            <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
                                <Button size="lg" className="h-16 px-10 text-lg bg-[#1E5128] hover:bg-[#76BA1B] text-white rounded-2xl shadow-2xl shadow-[#1E5128]/20 transition-all font-bold group">
                                    Solicite um Orçamento Agora
                                    <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                </Button>
                                <Button size="lg" variant="outline" className="h-16 px-10 text-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl font-bold">
                                    Falar com Consultor
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* COMPARAÇÃO DE RECURSOS BÁSICA */}
                <section className="py-20 bg-gray-50">
                    <div className="max-w-4xl mx-auto px-4 text-center border-t border-gray-200 pt-16">
                        <h3 className="text-2xl font-bold text-gray-600 mb-8 font-montserrat">Tudo o que já está garantido em TODAS as licenças</h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            {["Sincronismo Delta Otimizado", "Criptografia AES-256", "Cálculo de IPI/ST nativo", "Múltiplos Bancos de Preço", "App White-Label (Seu logo)", "Suporte Telefônico no H.C", "Suporte Nuvem Privada"].map((perk, i) => (
                                <span key={i} className="bg-white border border-gray-200 text-sm text-gray-600 px-4 py-2 rounded-full shadow-sm flex items-center">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> {perk}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ SECTION */}
                <section className="py-24 bg-white border-t border-gray-100">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-50 text-sm font-semibold text-blue-700 mb-4">
                                <HelpCircle className="w-4 h-4 mr-2" /> Dúvidas Frequentes
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black font-montserrat">Você Pergunta, Nós Respondemos</h2>
                        </div>

                        <div className="space-y-4">
                            {faqs.map((faq, index) => (
                                <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                        className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors text-left"
                                    >
                                        <span className="font-bold text-lg text-gray-900 pr-8">{faq.q}</span>
                                        <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform ${openFaq === index ? 'rotate-180 text-[#76BA1B]' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {openFaq === index && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="bg-gray-50 border-t border-gray-100 px-6 overflow-hidden"
                                            >
                                                <p className="py-6 text-gray-600 leading-relaxed text-[15px]">{faq.a}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>

                        <div className="text-center mt-12 bg-[#1E5128]/5 p-8 rounded-3xl border border-[#1E5128]/10">
                            <p className="text-gray-700 mb-4">Ainda tem dúvidas técnicas de como faremos The Fetch Delta nas suas tabelas do Sankhya?</p>
                            <button className="text-[#1E5128] font-bold border-b-2 border-[#1E5128] hover:text-[#76BA1B] hover:border-[#76BA1B] transition-colors pb-1">Agende uma reunião técnica com o CTO</button>
                        </div>
                    </div>
                </section>

            </main>

            <SiteFooter />
        </div>
    );
}

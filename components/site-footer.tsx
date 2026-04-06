"use client";

import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center mb-6">
                            <Image
                                src="/Logo_Final.png"
                                alt="PredictSales Logo"
                                width={60}
                                height={30}
                                className="object-contain"
                            />
                            <span className="ml-2 font-normal text-xl tracking-tight text-[#121212]">PredictSales</span>
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
                            Transformando a força de vendas de empresas complexas através de tecnologia inteligente e mobilidade.
                        </p>
                    </div>

                    <div>
                        <h5 className="font-bold text-[#121212] mb-4">Produto</h5>
                        <ul className="space-y-3">
                            <li><Link href="/sobre" className="text-gray-500 hover:text-[#1E5128] text-sm">Sobre nós</Link></li>
                            <li><Link href="/funcionalidades" className="text-gray-500 hover:text-[#1E5128] text-sm">Funcionalidades</Link></li>
                            <li><Link href="/ia" className="text-gray-500 hover:text-[#1E5128] text-sm">Inteligência Artificial</Link></li>
                            <li><Link href="/planos" className="text-gray-500 hover:text-[#1E5128] text-sm">Preços</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="font-bold text-[#121212] mb-4">Suporte</h5>
                        <ul className="space-y-3">
                            <li><Link href="/login" className="text-gray-500 hover:text-[#1E5128] text-sm">Acesso Cliente</Link></li>
                            <li><Link href="#" className="text-gray-500 hover:text-[#1E5128] text-sm">Central de Ajuda</Link></li>
                            <li><Link href="#" className="text-gray-500 hover:text-[#1E5128] text-sm">Contato</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-400">
                        &copy; {new Date().getFullYear()} PredictSales. Todos os direitos reservados.
                    </p>
                    <div className="flex space-x-6">
                        <span className="text-xs text-gray-400">Sankhya é uma marca registrada da Sankhya S/A.</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

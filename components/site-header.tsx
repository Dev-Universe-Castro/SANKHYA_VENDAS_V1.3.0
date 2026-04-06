"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function SiteHeader() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const pathname = usePathname();
    const isHome = pathname === "/";

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Determinar se o cabeçalho deve ser transparente ou sólido
    const isTransparent = isHome && !isScrolled;

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${!isTransparent ? "bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm" : "bg-transparent border-transparent"}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/">
                            <Image
                                src="/Logo_Final.png"
                                alt="PredictSales Logo"
                                width={60}
                                height={30}
                                className="object-contain"
                            />
                        </Link>
                        <span className={`ml-2 font-normal text-xl tracking-tight transition-colors ${!isTransparent ? "text-[#121212]" : "text-white"}`}>PredictSales</span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex space-x-8 items-center">
                        <Link href="/sobre" className={`text-sm font-medium transition-colors ${!isTransparent ? "text-gray-600 hover:text-[#1E5128]" : "text-white/90 hover:text-white"}`}>Sobre</Link>
                        <Link href="/funcionalidades" className={`text-sm font-medium transition-colors ${!isTransparent ? "text-gray-600 hover:text-[#1E5128]" : "text-white/90 hover:text-white"}`}>Funcionalidades</Link>
                        <Link href="/ia" className={`text-sm font-medium transition-colors ${!isTransparent ? "text-gray-600 hover:text-[#1E5128]" : "text-white/90 hover:text-white"}`}>IA</Link>
                        <Link href="/integracao-sankhya" className={`text-sm font-medium transition-colors ${!isTransparent ? "text-gray-600 hover:text-[#1E5128]" : "text-white/90 hover:text-white"}`}>Integração Sankhya</Link>
                        <Link href="/planos" className={`text-sm font-medium transition-colors ${!isTransparent ? "text-gray-600 hover:text-[#1E5128]" : "text-white/90 hover:text-white"}`}>Planos</Link>
                    </nav>

                    {/* Action Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Link href="/login">
                            <Button className="bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-full px-6 transition-all shadow-md hover:shadow-lg">
                                Acessar o Sistema
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Actions */}
                    <div className="flex items-center space-x-1 md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={`hover:text-[#1E5128] focus:outline-none p-2 ml-2 ${!isTransparent ? "text-gray-500" : "text-white"}`}
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-1 flex flex-col">
                            <Link href="/sobre" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#1E5128] hover:bg-gray-50 rounded-md">Sobre</Link>
                            <Link href="/funcionalidades" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#1E5128] hover:bg-gray-50 rounded-md">Funcionalidades</Link>
                            <Link href="/ia" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#1E5128] hover:bg-gray-50 rounded-md">IA</Link>
                            <Link href="/integracao-sankhya" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#1E5128] hover:bg-gray-50 rounded-md">Integração Sankhya</Link>
                            <Link href="/planos" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-gray-700 hover:text-[#1E5128] hover:bg-gray-50 rounded-md">Planos</Link>
                            <div className="pt-4 flex flex-col gap-3">
                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="outline" className="w-full justify-center border-[#76BA1B] text-[#1E5128]">Fazer Login</Button>
                                </Link>
                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full justify-center bg-[#76BA1B] text-white">Acessar o Sistema</Button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}

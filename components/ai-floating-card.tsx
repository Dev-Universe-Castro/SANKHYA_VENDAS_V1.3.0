"use client"

import { Sparkles, MessageSquare, BarChart3 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"

export default function AIFloatingCard() {
  const router = useRouter()
  const isMobile = useIsMobile()

  // Aguardar determinação se é mobile antes de renderizar
  if (isMobile === undefined) {
    return null
  }

  // Não renderizar em desktop
  if (!isMobile) {
    return null
  }

  return (
    <div className="fixed left-0 right-0 bottom-24 lg:bottom-8 z-40 px-4 lg:px-6 pointer-events-none">
      <Card className="max-w-4xl mx-auto pointer-events-auto bg-white border-2 border-emerald-500 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6 lg:py-3">
          {/* Left section - Logo, Title and description */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <Image
                src="/sankhya-icon.jpg"
                alt="Sankhya"
                width={24}
                height={24}
                className="w-6 h-6 lg:w-7 lg:h-7 rounded"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm lg:text-base font-semibold text-black">
                Inteligência Artificial Integrada
              </h3>
              <p className="text-xs lg:text-sm text-gray-700 truncate">
                Seu diferencial competitivo em vendas e análises
              </p>
            </div>
          </div>

          {/* Right section - Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Desktop buttons */}
            <Button
              onClick={() => router.push("/dashboard/chat")}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white hidden sm:flex items-center gap-2 shadow-sm rounded-full px-4"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden lg:inline">IA Assistente</span>
              <span className="lg:hidden">Assistente</span>
            </Button>
            <Button
              onClick={() => router.push("/dashboard/analise")}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white hidden sm:flex items-center gap-2 shadow-sm rounded-full px-4"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden lg:inline">IA Análise</span>
              <span className="lg:hidden">Análise</span>
            </Button>

            {/* Mobile buttons */}
            <div className="sm:hidden flex gap-2">
              <Button
                onClick={() => router.push("/dashboard/chat")}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-full"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => router.push("/dashboard/analise")}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm rounded-full"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
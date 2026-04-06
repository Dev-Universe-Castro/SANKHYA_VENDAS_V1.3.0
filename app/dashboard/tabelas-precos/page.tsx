"use client"

import DashboardLayout from "@/components/dashboard-layout"
import TabelasPrecosView from "@/components/tabelas-precos-view"
import { RouteGuard } from "@/components/route-guard"
import PoliticasComerciaisView from "@/components/politicas-comerciais-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApprovalsTab } from "@/components/approvals-tab"
import { useState, useEffect } from "react"
import { WifiOff } from "lucide-react"

export default function PoliticasPage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(window.navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <RouteGuard requiredScreen="telaTabelaPrecos">
      <DashboardLayout>
        <div className="flex flex-col h-full bg-transparent overflow-hidden scrollbar-hide">
          {/* Header - Desktop */}
          <div className="hidden md:block px-4 md:px-6 py-4 bg-transparent border-b border-[#F2F2F2]">
            <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Tabelas e Políticas</h1>
            <p className="text-[#1E5128]/70 mt-1">
              Gestão de políticas comerciais, tabelas de preços e aprovações.
            </p>
          </div>

          {/* Header - Mobile */}
          <div className="md:hidden px-4 py-4 bg-transparent border-b border-[#F2F2F2]">
            <h1 className="text-xl font-bold text-[#1E5128]">Tabelas e Políticas</h1>
            <p className="text-sm text-[#1E5128]/70 mt-1">
              Políticas, preços e aprovações
            </p>
          </div>

          {!isOnline && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">
                Modo Offline: Os dados exibidos são do cache local.
              </span>
            </div>
          )}

          <Tabs defaultValue="tabelas-precos" className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-[#F2F2F2] px-4 md:px-6 py-2 bg-slate-50/50">
              <TabsList className="grid w-full grid-cols-3 h-[42px] p-1 bg-white border border-[#F2F2F2] rounded-xl shadow-sm">
                <TabsTrigger value="politicas" className="text-[10px] md:text-sm font-bold text-slate-500 rounded-lg transition-all data-[state=active]:bg-[#1E5128] data-[state=active]:text-white data-[state=active]:shadow-md">
                  Políticas Comerciais
                </TabsTrigger>
                <TabsTrigger value="tabelas-precos" className="text-[10px] md:text-sm font-bold text-slate-500 rounded-lg transition-all data-[state=active]:bg-[#1E5128] data-[state=active]:text-white data-[state=active]:shadow-md">
                  Tabelas de Preços
                </TabsTrigger>
                <TabsTrigger value="aprovacoes" className="text-[10px] md:text-sm font-bold text-slate-500 rounded-lg transition-all data-[state=active]:bg-[#1E5128] data-[state=active]:text-white data-[state=active]:shadow-md">
                  Aprovações
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="politicas" className="flex-1 overflow-auto">
              <PoliticasComerciaisView />
            </TabsContent>

            <TabsContent value="tabelas-precos" className="flex-1 overflow-hidden m-0">
              <TabelasPrecosView />
            </TabsContent>

            <TabsContent value="aprovacoes" className="flex-1 overflow-auto p-4">
              <ApprovalsTab />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </RouteGuard>
  )
}

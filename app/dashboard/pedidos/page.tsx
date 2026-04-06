"use client"

import DashboardLayout from "@/components/dashboard-layout"
import PortalPedidos from "@/components/portal-pedidos"
import PedidosSyncMonitor from "@/components/pedidos-sync-monitor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RouteGuard } from "@/components/route-guard"

export default function PedidosPage() {
  return (
    <RouteGuard requiredScreen="telaPedidosVendas">
      <DashboardLayout>
        <div className="flex flex-col h-full bg-transparent overflow-hidden scrollbar-hide">
          {/* Header - Desktop */}
          <div className="hidden md:block p-6 bg-transparent">
            <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Portal de Vendas</h1>
            <p className="text-[#1E5128]/70 mt-1">
              Acompanhamento de faturamento e integração em tempo real
            </p>
          </div>

          {/* Header - Mobile */}
          <div className="md:hidden px-4 py-4 bg-transparent border-b border-black/5">
            <h1 className="text-xl font-bold text-[#1E5128]">Portal de Vendas</h1>
            <p className="text-sm text-[#1E5128]/70 mt-1">
              Acompanhamento em tempo real
            </p>
          </div>

          <Tabs defaultValue="portal" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 md:px-8 py-2">
              <TabsList className="grid w-full md:w-[450px] grid-cols-2 h-11 p-1 bg-white border border-[#F2F2F2] rounded-full shadow-sm mx-auto md:mx-0">
                <TabsTrigger value="portal" className="text-xs sm:text-sm font-semibold transition-all rounded-full data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white data-[state=active]:shadow-md">
                  <span className="hidden sm:inline">Portal de Vendas</span>
                  <span className="sm:hidden">PORTAL</span>
                </TabsTrigger>
                <TabsTrigger value="sincronizador" className="text-xs sm:text-sm font-semibold transition-all rounded-full data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white data-[state=active]:shadow-md">
                  <span className="hidden sm:inline">Sincronizador</span>
                  <span className="sm:hidden">SYNC</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto scrollbar-hide px-6 md:px-8 pb-8 mt-4">
              <TabsContent value="portal" className="m-0 border-none p-0 focus-visible:ring-0">
                <PortalPedidos />
              </TabsContent>

              <TabsContent value="sincronizador" className="m-0 border-none p-0 focus-visible:ring-0">
                <PedidosSyncMonitor />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DashboardLayout>
    </RouteGuard>
  )
}

'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from "@/components/ui/skeleton"
import DashboardLayout from "@/components/dashboard-layout"
import { RouteGuard } from "@/components/route-guard"

const RotasManager = dynamic(() => import('@/components/rotas-manager'), {
  ssr: false,
  loading: () => (
    <div className="p-8 space-y-4">
      <Skeleton className="h-12 w-[250px]" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
})

export default function RotasPage() {
  return (
    <RouteGuard requiredScreen="telaRotas">
      <DashboardLayout>
        <RotasManager />
      </DashboardLayout>
    </RouteGuard>
  )
}

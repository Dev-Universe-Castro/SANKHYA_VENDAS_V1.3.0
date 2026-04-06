"use client"

import DashboardLayout from "@/components/dashboard-layout"
import PartnersTable from "@/components/partners-table"
import { RouteGuard } from "@/components/route-guard"

export default function ParceirosPage() {
  return (
    <RouteGuard requiredScreen="telaClientes">
      <DashboardLayout>
        <PartnersTable />
      </DashboardLayout>
    </RouteGuard>
  )
}

"use client"

import DashboardLayout from "@/components/dashboard-layout"
import UsersTable from "@/components/users-table"
import { RouteGuard } from "@/components/route-guard"

export default function UsuariosPage() {
  return (
    <RouteGuard requiredScreen="telaUsuarios">
      <DashboardLayout>
        <UsersTable />
      </DashboardLayout>
    </RouteGuard>
  )
}

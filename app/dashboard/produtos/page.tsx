"use client"

import DashboardLayout from "@/components/dashboard-layout"
import ProductsTable from "@/components/products-table"
import { RouteGuard } from "@/components/route-guard"

export default function ProdutosPage() {
  return (
    <RouteGuard requiredScreen="telaProdutos">
      <DashboardLayout>
        <ProductsTable />
      </DashboardLayout>
    </RouteGuard>
  )
}

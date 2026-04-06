
"use client"

import DashboardLayout from "@/components/dashboard-layout"
import EquipesManager from "@/components/equipes-manager"
import { authService } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function EquipeComercialPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    const allowedRoles = ["Gerente", "Administrador"]

    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      router.push("/dashboard")
    } else {
      setIsAuthorized(true)
    }
  }, [router])

  if (!isAuthorized) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-transparent overflow-hidden scrollbar-hide">
        {/* Header - Desktop */}
        <div className="hidden md:block p-6 bg-transparent">
          <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Equipes Comerciais</h1>
          <p className="text-[#1E5128]/70 mt-1">
            Gerencie sua estrutura de vendas, defina gestores e organize membros.
          </p>
        </div>

        {/* Header - Mobile */}
        <div className="md:hidden px-4 py-4 bg-transparent border-b border-black/5">
          <h1 className="text-xl font-bold text-[#1E5128]">Equipes Comerciais</h1>
          <p className="text-sm text-[#1E5128]/70 mt-1">
            Gerencie sua estrutura de vendas
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 pb-24 md:pb-6 custom-scrollbar">
          <EquipesManager />
        </div>
      </div>
    </DashboardLayout>
  )
}


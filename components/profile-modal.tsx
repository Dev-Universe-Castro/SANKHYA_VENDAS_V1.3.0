"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera } from "lucide-react"
import { authService } from "@/lib/auth-service"
import type { User } from "@/lib/users-service"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onUpdate: (user: User) => void
}

export default function ProfileModal({ isOpen, onClose, user, onUpdate }: ProfileModalProps) {
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    avatar: user.avatar || "",
  })
  const [isLoading, setIsLoading] = useState(false)

  // Update form data when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || "",
      })
    }
  }, [isOpen, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const updatedUser = await authService.updateProfile(formData)
      if (updatedUser) {
        onUpdate(updatedUser)
        onClose()
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const initials = formData.name
    ? formData.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "US"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="sm:max-w-md p-0 overflow-hidden sm:rounded-2xl border-0 shadow-lg" aria-describedby={undefined}>
        <div className="p-4 border-b border-[#F2F2F2] bg-white flex justify-between items-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#76BA1B]/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-[#1E5128] font-montserrat">Editar Perfil</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Atualize suas informações pessoais</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-white shadow-md ring-2 ring-[#76BA1B]/20 ring-offset-1">
                <AvatarImage src={formData.avatar || "/placeholder-user.png"} alt={formData.name} />
                <AvatarFallback className="bg-[#76BA1B] text-white text-xl font-bold font-montserrat">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-sm border border-[#F2F2F2]">
                <Camera className="w-4 h-4 text-[#76BA1B]" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Preview da Foto</p>
          </div>

          <div className="space-y-4">
            {/* Avatar URL Field */}
            <div className="space-y-1.5">
              <Label htmlFor="avatar" className="text-xs font-semibold text-[#1E5128] pl-1">URL da Foto</Label>
              <Input
                id="avatar"
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                placeholder="https://exemplo.com/foto.jpg"
                className="h-11 bg-[#F2F2F2]/50 border-transparent hover:bg-[#F2F2F2] focus:bg-white focus:border-[#76BA1B] focus:ring-[#76BA1B]/20 transition-all rounded-xl text-sm shadow-none"
              />
            </div>

            {/* Name Field */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-[#1E5128] pl-1">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-11 bg-[#F2F2F2]/50 border-transparent hover:bg-[#F2F2F2] focus:bg-white focus:border-[#76BA1B] focus:ring-[#76BA1B]/20 transition-all rounded-xl text-sm shadow-none font-medium"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-[#1E5128] pl-1">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-11 bg-[#F2F2F2]/50 border-transparent hover:bg-[#F2F2F2] focus:bg-white focus:border-[#76BA1B] focus:ring-[#76BA1B]/20 transition-all rounded-xl text-sm shadow-none"
              />
            </div>

            {/* Role (Read-only) */}
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs font-semibold text-muted-foreground pl-1">Função no Sistema</Label>
              <Input
                id="role"
                value={user.role}
                disabled
                className="h-11 bg-muted/50 border-transparent rounded-xl text-sm text-muted-foreground shadow-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-[#F2F2F2] hover:bg-[#F2F2F2] hover:text-[#1E5128] h-10 px-5 text-sm font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-[#76BA1B] hover:bg-[#65A017] text-white h-10 px-6 text-sm font-semibold shadow-sm"
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

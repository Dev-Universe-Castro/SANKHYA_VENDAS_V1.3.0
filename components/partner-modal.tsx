
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => <div className="w-full h-[300px] bg-muted rounded-md flex items-center justify-center">Carregando mapa...</div>
})

interface PartnerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: (partnerData: any) => Promise<void>
  partner: { 
    _id: string
    CODPARC: string
    NOMEPARC: string
    CGC_CPF: string
    CODCID?: string
    ATIVO?: string
    TIPPESSOA?: string
    CODVEND?: number
    RAZAOSOCIAL?: string
    IDENTINSCESTAD?: string
    CEP?: string
    CODEND?: string
    NUMEND?: string
    COMPLEMENTO?: string
    CODBAI?: string
    LATITUDE?: string
    LONGITUDE?: string
  } | null
  currentUser?: any
}

export function PartnerModal({ isOpen, onClose, partner, onSave }: PartnerModalProps) {
  const [formData, setFormData] = useState({
    CODPARC: "",
    NOMEPARC: "",
    RAZAOSOCIAL: "",
    IDENTINSCESTAD: "",
    CGC_CPF: "",
    ATIVO: "S",
    TIPPESSOA: "F",
    CODVEND: "",
    CEP: "",
    CODEND: "",
    NUMEND: "",
    COMPLEMENTO: "",
    CODBAI: "",
    CODCID: "",
    LATITUDE: "",
    LONGITUDE: "",
  })
  const [isInitializing, setIsInitializing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onSave) return

    try {
      setIsSaving(true)
      await onSave(formData)
    } catch (error) {
      console.error("Erro ao salvar parceiro:", error)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true)
      
      if (partner) {
        setFormData({
          CODPARC: partner.CODPARC || "",
          NOMEPARC: partner.NOMEPARC || "",
          RAZAOSOCIAL: partner.RAZAOSOCIAL || "",
          IDENTINSCESTAD: partner.IDENTINSCESTAD || "",
          CGC_CPF: partner.CGC_CPF || "",
          ATIVO: partner.ATIVO || "S",
          TIPPESSOA: partner.TIPPESSOA || "F",
          CODVEND: partner.CODVEND?.toString() || "",
          CEP: partner.CEP || "",
          CODEND: partner.CODEND || "",
          NUMEND: partner.NUMEND || "",
          COMPLEMENTO: partner.COMPLEMENTO || "",
          CODBAI: partner.CODBAI || "",
          CODCID: partner.CODCID || "",
          LATITUDE: partner.LATITUDE || "",
          LONGITUDE: partner.LONGITUDE || "",
        })
      } else {
        setFormData({
          CODPARC: "",
          NOMEPARC: "",
          RAZAOSOCIAL: "",
          IDENTINSCESTAD: "",
          CGC_CPF: "",
          ATIVO: "S",
          TIPPESSOA: "F",
          CODVEND: "",
          CEP: "",
          CODEND: "",
          NUMEND: "",
          COMPLEMENTO: "",
          CODBAI: "",
          CODCID: "",
          LATITUDE: "",
          LONGITUDE: "",
        })
      }
      
      requestAnimationFrame(() => {
        setIsInitializing(false)
      })
    }
  }, [partner, isOpen])

  if (!isOpen) return null

  const getAvatarColor = (name: string) => {
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
      '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
      '#A855F7', '#EC4899', '#F43F5E'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 0) return '??';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const avatarColor = getAvatarColor(formData.NOMEPARC || 'Parceiro');
  const initials = getInitials(formData.NOMEPARC || 'Parceiro');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Loading Overlay */}
      {isInitializing && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">
              Carregando dados...
            </p>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isInitializing ? onClose : undefined} />

      {/* Modal */}
      <div className="relative bg-card rounded-lg shadow-xl w-full md:max-w-3xl md:mx-4 flex flex-col h-full md:h-auto md:max-h-[90vh]">
        {/* Header - Mobile */}
        <div className="md:hidden flex-shrink-0 bg-card border-b">
          <div className="flex items-center justify-between p-3">
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-foreground">
              Detalhes do Cliente
            </h2>
            <div className="w-6" />
          </div>
          
          {/* Avatar e Dados Principais - Mobile */}
          <div className="flex flex-col py-4 px-4 border-b">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {formData.NOMEPARC || 'Nome do Cliente'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formData.TIPPESSOA === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="CODPARC-mobile" className="text-[10px] font-medium text-muted-foreground">
                  Código
                </Label>
                <Input
                  id="CODPARC-mobile"
                  type="text"
                  value={formData.CODPARC || 'Novo'}
                  className="bg-background h-7 text-xs font-semibold"
                  disabled
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="NOMEPARC-mobile" className="text-[10px] font-medium text-muted-foreground">
                  Nome *
                </Label>
                <Input
                  id="NOMEPARC-mobile"
                  type="text"
                  value={formData.NOMEPARC}
                  onChange={(e) => setFormData({ ...formData, NOMEPARC: e.target.value })}
                  className="bg-background h-7 text-xs font-semibold"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ATIVO-mobile" className="text-[10px] font-medium text-muted-foreground">
                  Ativo *
                </Label>
                <select
                  id="ATIVO-mobile"
                  value={formData.ATIVO}
                  onChange={(e) => setFormData({ ...formData, ATIVO: e.target.value })}
                  className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="S">S</option>
                  <option value="N">N</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Header - Desktop */}
        <div className="hidden md:block flex-shrink-0">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-foreground">
              {partner ? "Editar Parceiro" : "Cadastrar Parceiro"}
            </h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Avatar e Dados Principais - Desktop */}
          <div className="flex items-center gap-6 p-6 border-b bg-muted/30">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="CODPARC-desktop" className="text-xs font-medium text-muted-foreground">
                  Código Parceiro
                </Label>
                <Input
                  id="CODPARC-desktop"
                  type="text"
                  value={formData.CODPARC || 'Novo'}
                  className="bg-background h-9 text-sm font-semibold"
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="NOMEPARC-desktop" className="text-xs font-medium text-muted-foreground">
                  Nome Parceiro *
                </Label>
                <Input
                  id="NOMEPARC-desktop"
                  type="text"
                  value={formData.NOMEPARC}
                  onChange={(e) => setFormData({ ...formData, NOMEPARC: e.target.value })}
                  className="bg-background h-9 text-sm font-semibold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ATIVO-desktop" className="text-xs font-medium text-muted-foreground">
                  Ativo *
                </Label>
                <select
                  id="ATIVO-desktop"
                  value={formData.ATIVO}
                  onChange={(e) => setFormData({ ...formData, ATIVO: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="S">S</option>
                  <option value="N">N</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Tabs - Fixas */}
          <Tabs defaultValue="dados" className="flex flex-col flex-1 overflow-hidden">
            {/* TabsList - Desktop */}
            <TabsList className="hidden md:grid w-full grid-cols-4 gap-1 h-auto p-1 mx-6 mt-4 flex-shrink-0">
              <TabsTrigger value="dados" className="text-sm px-2 py-2 whitespace-nowrap">
                Dados
              </TabsTrigger>
              <TabsTrigger value="endereco" className="text-sm px-2 py-2 whitespace-nowrap">
                Endereço
              </TabsTrigger>
              <TabsTrigger value="entrega" className="text-sm px-2 py-2 whitespace-nowrap">
                End. Entrega
              </TabsTrigger>
              <TabsTrigger value="mapa" className="text-sm px-2 py-2 whitespace-nowrap">
                Mapa
              </TabsTrigger>
            </TabsList>

            {/* TabsList - Mobile */}
            <TabsList className="md:hidden w-full grid grid-cols-4 gap-0 h-auto p-0 bg-transparent border-b flex-shrink-0">
              <TabsTrigger value="dados" className="flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Dados</span>
              </TabsTrigger>
              <TabsTrigger value="endereco" className="flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Endereço</span>
              </TabsTrigger>
              <TabsTrigger value="entrega" className="flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Entrega</span>
              </TabsTrigger>
              <TabsTrigger value="mapa" className="flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span>Mapa</span>
              </TabsTrigger>
            </TabsList>

            {/* Conteúdo das Abas sem Scroll */}
            <div className="flex-1">
              {/* Aba Dados Principais */}
              <TabsContent value="dados" className="space-y-3 mt-3 px-3 md:px-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="RAZAOSOCIAL" className="text-xs font-medium text-foreground">
                      Razão Social
                    </Label>
                    <Input
                      id="RAZAOSOCIAL"
                      type="text"
                      value={formData.RAZAOSOCIAL}
                      onChange={(e) => setFormData({ ...formData, RAZAOSOCIAL: e.target.value })}
                      className="bg-background h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="IDENTINSCESTAD" className="text-xs font-medium text-foreground">
                      Inscrição Estadual
                    </Label>
                    <Input
                      id="IDENTINSCESTAD"
                      type="text"
                      value={formData.IDENTINSCESTAD}
                      onChange={(e) => setFormData({ ...formData, IDENTINSCESTAD: e.target.value })}
                      className="bg-background h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="CGC_CPF" className="text-xs font-medium text-foreground">
                      CPF / CNPJ *
                    </Label>
                    <Input
                      id="CGC_CPF"
                      type="text"
                      value={formData.CGC_CPF}
                      onChange={(e) => setFormData({ ...formData, CGC_CPF: e.target.value })}
                      className="bg-background h-9 text-sm"
                      placeholder="Apenas números"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="TIPPESSOA" className="text-xs font-medium text-foreground">
                      Tipo de Pessoa
                    </Label>
                    <select
                      id="TIPPESSOA"
                      value={formData.TIPPESSOA}
                      onChange={(e) => setFormData({ ...formData, TIPPESSOA: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="F">Física</option>
                      <option value="J">Jurídica</option>
                    </select>
                  </div>
                </div>
              </TabsContent>

              {/* Aba Endereço */}
              <TabsContent value="endereco" className="space-y-3 mt-3 px-3 md:px-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="CEP" className="text-xs font-medium text-foreground">
                      CEP
                    </Label>
                    <Input
                      id="CEP"
                      type="text"
                      value={formData.CEP}
                      onChange={(e) => setFormData({ ...formData, CEP: e.target.value })}
                      className="bg-background h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="CODEND" className="text-xs font-medium text-foreground">
                      Endereço
                    </Label>
                    <Input
                      id="CODEND"
                      type="text"
                      value={formData.CODEND}
                      onChange={(e) => setFormData({ ...formData, CODEND: e.target.value })}
                      className="bg-background h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="NUMEND" className="text-xs font-medium text-foreground">
                      Número
                    </Label>
                    <Input
                      id="NUMEND"
                      type="text"
                      value={formData.NUMEND}
                      onChange={(e) => setFormData({ ...formData, NUMEND: e.target.value })}
                      className="bg-background h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="COMPLEMENTO" className="text-xs font-medium text-foreground">
                      Complemento
                    </Label>
                    <Input
                      id="COMPLEMENTO"
                      type="text"
                      value={formData.COMPLEMENTO}
                      onChange={(e) => setFormData({ ...formData, COMPLEMENTO: e.target.value })}
                      className="bg-background h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="CODBAI" className="text-xs font-medium text-foreground">
                      Código do Bairro
                    </Label>
                    <Input
                      id="CODBAI"
                      type="text"
                      value={formData.CODBAI}
                      onChange={(e) => setFormData({ ...formData, CODBAI: e.target.value })}
                      className="bg-background h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="CODCID" className="text-xs font-medium text-foreground">
                      Código da Cidade *
                    </Label>
                    <Input
                      id="CODCID"
                      type="text"
                      value={formData.CODCID}
                      onChange={(e) => setFormData({ ...formData, CODCID: e.target.value })}
                      className="bg-background h-9 text-sm"
                      placeholder="Ex: 1510"
                      required
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Endereço de Entrega */}
              <TabsContent value="entrega" className="space-y-3 mt-3 px-3 md:px-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="LATITUDE" className="text-xs font-medium text-foreground">
                      Latitude P/ Entrega
                    </Label>
                    <Input
                      id="LATITUDE"
                      type="text"
                      value={formData.LATITUDE}
                      onChange={(e) => setFormData({ ...formData, LATITUDE: e.target.value })}
                      className="bg-background h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="LONGITUDE" className="text-xs font-medium text-foreground">
                      Longitude P/ Entrega
                    </Label>
                    <Input
                      id="LONGITUDE"
                      type="text"
                      value={formData.LONGITUDE}
                      onChange={(e) => setFormData({ ...formData, LONGITUDE: e.target.value })}
                      className="bg-background h-9 text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Mapa */}
              <TabsContent value="mapa" className="space-y-3 mt-3 px-3 md:px-6 pb-4">
                {formData.LATITUDE && formData.LONGITUDE ? (
                  <div className="w-full">
                    <MapComponent 
                      latitude={parseFloat(formData.LATITUDE)} 
                      longitude={parseFloat(formData.LONGITUDE)}
                      partnerName={formData.NOMEPARC || "Parceiro"}
                    />
                  </div>
                ) : (
                  <div className="w-full h-[300px] bg-muted rounded-md flex items-center justify-center">
                    <p className="text-muted-foreground text-center">
                      Necessário Longitude e Latitude
                    </p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer - Fixo */}
          <div className="flex gap-2 p-3 border-t bg-card flex-shrink-0 md:gap-3 md:px-6 md:py-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 bg-transparent h-9 text-sm md:h-10"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-sm md:h-10"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : (partner ? "Salvar" : "Cadastrar")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

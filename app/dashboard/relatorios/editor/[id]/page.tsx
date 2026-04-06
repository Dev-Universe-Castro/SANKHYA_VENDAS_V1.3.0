"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReportDesigner, ReportItem } from "@/components/relatorios/report-designer"
import { ReportPreview } from "@/components/relatorios/report-preview"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Save, Eye, Layout, Search, Package } from "lucide-react"
import Link from "next/link"
import { authService } from "@/lib/auth-service"
import { toast } from "sonner"

export default function ReportEditorPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const user = authService.getCurrentUser()

  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [estrutura, setEstrutura] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(id !== 'novo')
  const [saving, setSaving] = useState(false)
  
  // Para preview
  const [testeNunota, setTesteNunota] = useState("123") // Valor padrão para teste
  const [dadosPedido, setDadosPedido] = useState<any>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (id && id !== 'novo') {
      fetchModelo()
    }
  }, [id])

  const fetchModelo = async () => {
    try {
      const resp = await fetch(`/api/relatorios/modelos?idEmpresa=${user?.ID_EMPRESA || 1}`)
      if (resp.ok) {
        const modelos = await resp.json()
        const modelo = modelos.find((m: any) => m.ID_MODELO.toString() === id)
        if (modelo) {
          setNome(modelo.NOME)
          setDescricao(modelo.DESCRICAO)
          setEstrutura(typeof modelo.ESTRUTURA_JSON === 'string' ? JSON.parse(modelo.ESTRUTURA_JSON) : modelo.ESTRUTURA_JSON)
        }
      }
    } catch (error) {
      console.error("Erro ao carregar modelo:", error)
      toast.error("Erro ao carregar modelo")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (novaEstrutura?: ReportItem[]) => {
    if (!nome) {
      toast.error("Por favor, dê um nome ao relatório")
      return
    }

    setSaving(true)
    const struct = novaEstrutura || estrutura

    try {
      const method = id === 'novo' ? 'POST' : 'PUT'
      const body = {
        id: id === 'novo' ? undefined : id,
        idEmpresa: user?.ID_EMPRESA || 1,
        codUsuario: user?.id,
        nome,
        descricao,
        estrutura: JSON.stringify(struct)
      }

      const resp = await fetch('/api/relatorios/modelos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (resp.ok) {
        toast.success("Relatório salvo com sucesso!")
        router.push('/dashboard/relatorios')
      } else {
        toast.error("Erro ao salvar relatório")
      }
    } catch (error) {
      console.error("Erro ao salvar:", error)
      toast.error("Erro ao salvar relatório")
    } finally {
      setSaving(false)
    }
  }

  const fetchDadosPedido = async () => {
    if (!testeNunota) return
    setLoadingPreview(true)
    try {
      const resp = await fetch(`/api/relatorios/dados?nunota=${testeNunota}&idEmpresa=${user?.ID_EMPRESA || 1}`)
      if (resp.ok) {
        const data = await resp.json()
        setDadosPedido(data)
      } else {
        toast.error("Pedido não encontrado para teste de visualização")
      }
    } catch (error) {
      console.error("Erro ao buscar pedido:", error)
    } finally {
      setLoadingPreview(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando...</div>

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-transparent overflow-hidden">
        {/* Top Header Barra */}
        <div className="p-4 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/relatorios">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[#1E5128] flex items-center gap-2 tracking-tight">
                <Layout className="w-5 h-5 text-[#76BA1B]" />
                {id === 'novo' ? 'Novo Relatório' : 'Editar Relatório'}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
                variant="outline" 
                className="rounded-xl px-6 border-red-200 text-red-500 hover:bg-red-50"
                onClick={() => router.push('/dashboard/relatorios')}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-[#76BA1B] hover:bg-[#76BA1B]/90 text-white rounded-xl px-8 shadow-md"
              onClick={() => handleSave()}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Relatório'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="editor" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-2 bg-gray-50 border-b flex justify-between items-center">
            <TabsList className="bg-white border rounded-full p-1 h-10 shadow-sm">
              <TabsTrigger value="editor" className="rounded-full data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white gap-2 text-xs font-bold uppercase tracking-wider">
                <Layout className="w-3 h-3" /> Designer
              </TabsTrigger>
              <TabsTrigger value="preview" className="rounded-full data-[state=active]:bg-[#76BA1B] data-[state=active]:text-white gap-2 text-xs font-bold uppercase tracking-wider" onClick={fetchDadosPedido}>
                <Eye className="w-3 h-3" /> Visualizar
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="editor" className="flex-1 flex flex-col overflow-hidden m-0 p-6 gap-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50/50 rounded-2xl border border-dashed border-[#76BA1B]/20">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-[#1E5128] uppercase tracking-wider">Nome do Relatório</Label>
                <Input 
                   placeholder="Ex: Nota Fiscal de Entrega" 
                   value={nome} 
                   onChange={(e) => setNome(e.target.value)}
                   className="rounded-xl border-gray-200 bg-white"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-xs font-bold text-[#1E5128] uppercase tracking-wider">Descrição Curta</Label>
                <Input 
                   placeholder="Ex: Modelo simplificado para canhoto de entrega" 
                   value={descricao} 
                   onChange={(e) => setDescricao(e.target.value)}
                   className="rounded-xl border-gray-200 bg-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
               <ReportDesigner initialStructure={estrutura} onSave={handleSave} />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-y-auto m-0 p-8 bg-gray-100/50">
            <div className="max-w-5xl mx-auto space-y-6">
              <Card className="rounded-2xl border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b py-4">
                   <div className="flex justify-between items-center">
                     <CardTitle className="text-sm font-bold text-[#1E5128] uppercase flex items-center gap-2">
                        <Search className="w-4 h-4 text-[#76BA1B]" /> Dados de Teste
                     </CardTitle>
                   </div>
                </CardHeader>
                <CardContent className="py-6 bg-white">
                  <div className="flex gap-4 items-end max-w-md">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400">Nº do Pedido para Teste</Label>
                      <div className="relative">
                         <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                         <Input 
                            value={testeNunota} 
                            onChange={(e) => setTesteNunota(e.target.value)} 
                            className="rounded-full pl-10 border-gray-100 bg-gray-50 focus:bg-white transition-all shadow-inner"
                         />
                      </div>
                    </div>
                    <Button onClick={fetchDadosPedido} className="rounded-full bg-[#1E5128] hover:bg-[#1E5128]/90 text-white px-8">
                       {loadingPreview ? 'Buscando...' : 'Atualizar Dados'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {dadosPedido ? (
                <ReportPreview 
                  modelo={{ NOME: nome, ESTRUTURA_JSON: JSON.stringify(estrutura) }} 
                  dados={dadosPedido} 
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-400">
                   <Eye className="w-12 h-12 mb-4 opacity-10" />
                   <p className="font-medium">Digite um NUNOTA de pedido real para ver a pré-visualização</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

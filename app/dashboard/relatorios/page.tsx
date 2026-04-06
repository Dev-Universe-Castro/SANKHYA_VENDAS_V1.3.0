"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Edit, Trash2, Layout, Printer, Search, FileDown } from "lucide-react"
import Link from "next/link"
import { authService } from "@/lib/auth-service"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ReportPreview } from "@/components/relatorios/report-preview"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const MOCK_DADOS_SIMULACAO = {
  pedido: {
    numero: "12345",
    tipo: "Pedido de Venda",
    condicao: "30/60/90 Dias",
    total: 1575.52,
    total_bruto: 1500.50,
    valor_desconto: 0,
    margem: "25.5%",
    itens_total: 3,
    desconto_total: 0,
    peso_total: "150kg",
    volumes: 5,
    nunota: "12345"
  },
  cliente: {
    razao_social: "Comercial de Simulação Ltda",
    nome_fantasia: "Simulação Store",
    cnpj: "00.000.000/0001-91",
    cpf_cnpj: "00.000.000/0001-91",
    ie: "ISENTO",
    endereco: "Av. Industrial, 500 - Bloco B",
    cidade: "Curitiba",
    uf: "PR"
  },
  vendedor: {
    nome: "Consultor de Teste Premium",
    email: "consultor@exemplo.com.br",
    telefone: "(46) 99999-0000"
  },
  empresa: {
    nome: "Sua Empresa Master",
    cnpj: "11.222.333/0001-44",
    endereco: "Sede Corporativa - São Paulo/SP"
  },
  data: {
    emissao: new Date().toLocaleDateString('pt-BR'),
    vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
  },
  sistema: {
    pagina: "1",
    total_paginas: "1"
  },
  impostos: [
    {
      codigoProduto: 1,
      valorTotal: 1000.50,
      impostos: [
        { nomeImposto: "ICMS", aliquota: 18, valorImposto: 180.09 },
        { nomeImposto: "IPI", aliquota: 5, valorImposto: 50.02 }
      ]
    },
    {
      codigoProduto: 2,
      valorTotal: 500.00,
      impostos: [
        { nomeImposto: "ICMS", aliquota: 18, valorImposto: 90.00 }
      ]
    }
  ],
  itens: [
    { CODPROD: "1", DESCRPROD: "Produto de Simulação A", QTDNEG: 2, VLRUNIT: 500.25, VLRTOT: 1000.50, UN: "UN", MARCA: "MARCA A" },
    { CODPROD: "2", DESCRPROD: "Produto de Simulação B", QTDNEG: 1, VLRUNIT: 500.00, VLRTOT: 500.00, UN: "CX", MARCA: "MARCA B" },
    { CODPROD: "3", DESCRPROD: "Produto de Simulação C", QTDNEG: 5, VLRUNIT: 0.00, VLRTOT: 0.00, UN: "UN", MARCA: "MARCA A" }
  ]
};

interface RelatorioModelo {
  ID_MODELO: number
  NOME: string
  DESCRICAO: string
  DATA_CRIACAO: string
}

export default function RelatoriosPage() {
  const [modelos, setModelos] = useState<RelatorioModelo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModelo, setSelectedModelo] = useState<any | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const user = authService.getCurrentUser()

  useEffect(() => {
    if (user) {
      fetchModelos()
    }
  }, [user])

  const fetchModelos = async () => {
    try {
      const resp = await fetch(`/api/relatorios/modelos?idEmpresa=${user?.ID_EMPRESA || 1}`)
      if (resp.ok) {
        const data = await resp.json()
        setModelos(data)
      }
    } catch (error) {
      console.error("Erro ao buscar modelos:", error)
      toast.error("Erro ao carregar modelos de relatórios")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este modelo?")) return

    try {
      const resp = await fetch(`/api/relatorios/modelos`, {
        method: 'PUT', // Usamos PUT para desativar (ATIVO='N')
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ativo: 'N' })
      })

      if (resp.ok) {
        toast.success("Modelo excluído com sucesso")
        fetchModelos()
      } else {
        toast.error("Erro ao excluir modelo")
      }
    } catch (error) {
      console.error("Erro ao excluir:", error)
      toast.error("Erro ao excluir modelo")
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-transparent overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-transparent flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Relatórios Personalizados</h1>
            <p className="text-[#1E5128]/70 mt-1">
              Gerencie seus modelos de relatórios com arrastar e soltar
            </p>
          </div>
          <Link href="/dashboard/relatorios/editor/novo">
            <Button className="bg-[#76BA1B] hover:bg-[#76BA1B]/90 text-white rounded-full px-6 py-6 shadow-lg transition-all hover:scale-105 active:scale-95 flex gap-2">
              <Plus className="w-5 h-5" />
              Novo Relatório
            </Button>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : modelos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="bg-[#76BA1B]/10 p-6 rounded-full mb-4">
                <Layout className="w-12 h-12 text-[#76BA1B]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1E5128]">Nenhum modelo encontrado</h3>
              <p className="text-[#1E5128]/60 mt-2 max-w-sm">
                Você ainda não criou nenhum modelo de relatório personalizado. Comece agora mesmo!
              </p>
              <Link href="/dashboard/relatorios/editor/novo" className="mt-6">
                <Button variant="outline" className="border-[#76BA1B] text-[#76BA1B] hover:bg-[#76BA1B] hover:text-white rounded-full px-8">
                  Criar Primeiro Modelo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#F2F2F2] shadow-sm bg-white overflow-hidden">
              <Table className="w-full">
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b border-[#F2F2F2] hover:bg-transparent">
                    <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-12 w-[80px]">ID</TableHead>
                    <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-12">Modelo</TableHead>
                    <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-12 hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-12 w-[150px]">Criação</TableHead>
                    <TableHead className="text-right text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider h-12 w-[350px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.map((modelo) => (
                    <TableRow key={modelo.ID_MODELO} className="hover:bg-slate-50/50 transition-colors border-b border-[#F2F2F2]">
                      <TableCell className="font-mono text-xs text-slate-400">
                        #{modelo.ID_MODELO}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="bg-[#76BA1B]/10 p-2 rounded-lg text-[#76BA1B]">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-[#1E5128] text-sm md:text-base">
                            {modelo.NOME}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-slate-500 text-sm line-clamp-1 max-w-md">
                          {modelo.DESCRICAO || "Sem descrição"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-xs text-slate-400 font-medium">
                          {new Date(modelo.DATA_CRIACAO).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 py-1">
                          <Button 
                            onClick={() => {
                                setSelectedModelo(modelo);
                                setIsPreviewOpen(true);
                            }}
                            className="bg-[#1E5128] hover:bg-[#1E5128]/90 text-white font-bold rounded-xl h-9 px-4 text-xs gap-2 shadow-sm transition-all active:scale-95"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Imprimir</span>
                          </Button>
                          
                          <Link href={`/dashboard/relatorios/editor/${modelo.ID_MODELO}`}>
                            <Button 
                              variant="outline" 
                              className="border-[#F2F2F2] hover:bg-slate-50 text-slate-600 font-bold rounded-xl h-9 px-4 text-xs gap-2 transition-all active:scale-95"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Editar Layout</span>
                            </Button>
                          </Link>

                          <Button 
                            variant="outline" 
                            onClick={() => handleDelete(modelo.ID_MODELO)}
                            className="border-red-100 hover:bg-red-50 text-red-500 font-bold rounded-xl h-9 px-3 transition-all active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Modal de Simulação */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto bg-slate-50 border-none p-0 gap-0">
            <DialogHeader className="p-6 bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <DialogTitle className="text-xl font-bold text-[#1E5128]">
                            Simulação de Impressão
                        </DialogTitle>
                        <p className="text-xs text-slate-500 font-medium">Os dados abaixo são simulados para visualização do layout</p>
                    </div>
                </div>
            </DialogHeader>
            <div className="p-8">
                {selectedModelo && (
                    <ReportPreview 
                        modelo={selectedModelo}
                        dados={MOCK_DADOS_SIMULACAO}
                    />
                )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

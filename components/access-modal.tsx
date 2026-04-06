"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Shield, Users, Package, ClipboardList, MapPin, CheckSquare, Settings, Bot, Eye, Save, Search, Loader2, Trash2, LineChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import type { User } from "@/lib/types"

interface ClienteManual {
  CODPARC: number
  NOMEPARC: string
  CGC_CPF?: string
  TIPPESSOA?: string
}

interface ProdutoManual {
  CODPROD: number
  DESCRPROD: string
  CODVOL?: string
}

interface MarcaManual {
  CODIGO: number
  DESCRICAO: string
}

interface GrupoManual {
  CODGRUPOPROD: number
  DESCRGRUPOPROD: string
}

interface AccessModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

interface UserAccess {
  acessoClientes: 'VINCULADO' | 'EQUIPE' | 'MANUAL' | 'TODOS'
  acessoProdutos: 'TODOS' | 'MARCA' | 'GRUPO' | 'MANUAL'
  acessoTarefas: 'VINCULADO' | 'EQUIPE' | 'TODOS'
  acessoAdministracao: boolean
  acessoUsuarios: boolean
  telaPedidosVendas: boolean
  telaRotas: boolean
  telaTarefas: boolean
  telaNegocios: boolean
  telaClientes: boolean
  telaProdutos: boolean
  telaPoliticas: boolean
  telaUsuarios: boolean
  telaAdministracao: boolean
  telaDashboard: boolean
}

const defaultAccess: UserAccess = {
  acessoClientes: 'VINCULADO',
  acessoProdutos: 'TODOS',
  acessoTarefas: 'VINCULADO',
  acessoAdministracao: false,
  acessoUsuarios: false,
  telaPedidosVendas: true,
  telaRotas: true,
  telaTarefas: true,
  telaNegocios: true,
  telaClientes: true,
  telaProdutos: true,
  telaPoliticas: true,
  telaUsuarios: false,
  telaAdministracao: false,
  telaDashboard: true,
}

export default function AccessModal({ isOpen, onClose, user }: AccessModalProps) {
  const [access, setAccess] = useState<UserAccess>(defaultAccess)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [vendedorNome, setVendedorNome] = useState<string>("")

  const [selectedClientes, setSelectedClientes] = useState<ClienteManual[]>([])
  const [selectedProdutos, setSelectedProdutos] = useState<ProdutoManual[]>([])
  const [searchClientes, setSearchClientes] = useState("")
  const [searchProdutos, setSearchProdutos] = useState("")
  const [clientesList, setClientesList] = useState<ClienteManual[]>([])
  const [produtosList, setProdutosList] = useState<ProdutoManual[]>([])
  const [isSearchingClientes, setIsSearchingClientes] = useState(false)
  const [isSearchingProdutos, setIsSearchingProdutos] = useState(false)

  const [selectedMarcas, setSelectedMarcas] = useState<MarcaManual[]>([])
  const [selectedGrupos, setSelectedGrupos] = useState<GrupoManual[]>([])
  const [searchMarcas, setSearchMarcas] = useState("")
  const [searchGrupos, setSearchGrupos] = useState("")
  const [marcasList, setMarcasList] = useState<MarcaManual[]>([])
  const [gruposList, setGruposList] = useState<GrupoManual[]>([])
  const [isSearchingMarcas, setIsSearchingMarcas] = useState(false)
  const [isSearchingGrupos, setIsSearchingGrupos] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      loadAccess()
      loadVendedorNome()
      loadManualClientes()
      loadManualProdutos()
      loadManualMarcas()
      loadManualGrupos()
    }
  }, [isOpen, user])

  const loadManualClientes = async () => {
    if (!user) return
    try {
      const response = await fetch(`/api/usuarios/acessos/clientes?codUsuario=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedClientes(data.clientes || [])
      }
    } catch (error) {
      console.error("Erro ao carregar clientes manuais:", error)
    }
  }

  const loadManualProdutos = async () => {
    if (!user) return
    try {
      const response = await fetch(`/api/usuarios/acessos/produtos?codUsuario=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedProdutos(data.produtos || [])
      }
    } catch (error) {
      console.error("Erro ao carregar produtos manuais:", error)
    }
  }

  const loadManualMarcas = async () => {
    if (!user) return
    try {
      const response = await fetch(`/api/usuarios/acessos/marcas?codUsuario=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedMarcas(data.marcas || [])
      }
    } catch (error) {
      console.error("Erro ao carregar marcas manuais:", error)
    }
  }

  const loadManualGrupos = async () => {
    if (!user) return
    try {
      const response = await fetch(`/api/usuarios/acessos/grupos?codUsuario=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedGrupos(data.grupos || [])
      }
    } catch (error) {
      console.error("Erro ao carregar grupos manuais:", error)
    }
  }

  const searchClientesApi = useCallback(async (term: string) => {
    if (term.length < 2) {
      setClientesList([])
      return
    }
    setIsSearchingClientes(true)
    try {
      // Tentar buscar offline primeiro ou como fallback
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const parceiros = await OfflineDataService.getParceiros({ search: term })

      if (parceiros && parceiros.length > 0) {
        const clientes = parceiros.map((p: any) => ({
          CODPARC: p.CODPARC,
          NOMEPARC: p.NOMEPARC,
          CGC_CPF: p.CGC_CPF,
          TIPPESSOA: p.TIPPESSOA
        }))
        setClientesList(clientes)
      } else {
        // Fallback para API caso não encontre nada offline (opcional, dependendo do comportamento desejado)
        const response = await fetch(`/api/sankhya/parceiros/search?busca=${encodeURIComponent(term)}&limite=20`)
        if (response.ok) {
          const data = await response.json()
          const clientes = (data.parceiros || []).map((p: any) => ({
            CODPARC: p.CODPARC,
            NOMEPARC: p.NOMEPARC,
            CGC_CPF: p.CGC_CPF,
            TIPPESSOA: p.TIPPESSOA
          }))
          setClientesList(clientes)
        }
      }
    } catch (error) {
      console.error("Erro ao buscar clientes:", error)
    } finally {
      setIsSearchingClientes(false)
    }
  }, [])

  const searchProdutosApi = useCallback(async (term: string) => {
    if (term.length < 2) {
      setProdutosList([])
      return
    }
    setIsSearchingProdutos(true)
    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const produtosOffline = await OfflineDataService.getProdutos({ search: term })

      if (produtosOffline && produtosOffline.length > 0) {
        const produtos = produtosOffline.map((p: any) => ({
          CODPROD: p.CODPROD,
          DESCRPROD: p.DESCRPROD,
          CODVOL: p.CODVOL
        }))
        setProdutosList(produtos)
      } else {
        const response = await fetch(`/api/sankhya/produtos/search?busca=${encodeURIComponent(term)}&limite=20`)
        if (response.ok) {
          const data = await response.json()
          const produtos = (data.produtos || []).map((p: any) => ({
            CODPROD: p.CODPROD,
            DESCRPROD: p.DESCRPROD,
            CODVOL: p.CODVOL
          }))
          setProdutosList(produtos)
        }
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error)
    } finally {
      setIsSearchingProdutos(false)
    }
  }, [])

  const searchMarcasApi = useCallback(async (term: string) => {
    if (term.length < 1) {
      setMarcasList([])
      return
    }
    setIsSearchingMarcas(true)
    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const marcas = await OfflineDataService.getMarcas(term)
      setMarcasList(marcas.map((m: any) => ({
        CODIGO: m.CODIGO,
        DESCRICAO: m.DESCRICAO
      })))
    } catch (error) {
      console.error("Erro ao buscar marcas:", error)
    } finally {
      setIsSearchingMarcas(false)
    }
  }, [])

  const searchGruposApi = useCallback(async (term: string) => {
    if (term.length < 1) {
      setGruposList([])
      return
    }
    setIsSearchingGrupos(true)
    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const grupos = await OfflineDataService.getGruposProdutos(term)
      setGruposList(grupos.map((g: any) => ({
        CODGRUPOPROD: g.CODGRUPOPROD,
        DESCRGRUPOPROD: g.DESCRGRUPOPROD
      })))
    } catch (error) {
      console.error("Erro ao buscar grupos:", error)
    } finally {
      setIsSearchingGrupos(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchClientesApi(searchClientes)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchClientes, searchClientesApi])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProdutosApi(searchProdutos)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchProdutos, searchProdutosApi])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMarcasApi(searchMarcas)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchMarcas, searchMarcasApi])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchGruposApi(searchGrupos)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchGrupos, searchGruposApi])

  const toggleCliente = (cliente: ClienteManual) => {
    setSelectedClientes(prev => {
      const exists = prev.find(c => c.CODPARC === cliente.CODPARC)
      if (exists) {
        return prev.filter(c => c.CODPARC !== cliente.CODPARC)
      }
      return [...prev, cliente]
    })
  }

  const toggleProduto = (produto: ProdutoManual) => {
    setSelectedProdutos(prev => {
      const exists = prev.find(p => p.CODPROD === produto.CODPROD)
      if (exists) {
        return prev.filter(p => p.CODPROD !== produto.CODPROD)
      }
      return [...prev, produto]
    })
  }

  const removeCliente = (codParc: number) => {
    setSelectedClientes(prev => prev.filter(c => c.CODPARC !== codParc))
  }

  const removeProduto = (codProd: number) => {
    setSelectedProdutos(prev => prev.filter(p => p.CODPROD !== codProd))
  }

  const toggleMarca = (marca: MarcaManual) => {
    setSelectedMarcas(prev => {
      const exists = prev.find(m => m.CODIGO === marca.CODIGO)
      if (exists) {
        return prev.filter(m => m.CODIGO !== marca.CODIGO)
      }
      return [...prev, marca]
    })
  }

  const toggleGrupo = (grupo: GrupoManual) => {
    setSelectedGrupos(prev => {
      const exists = prev.find(g => g.CODGRUPOPROD === grupo.CODGRUPOPROD)
      if (exists) {
        return prev.filter(g => g.CODGRUPOPROD !== grupo.CODGRUPOPROD)
      }
      return [...prev, grupo]
    })
  }

  const removeMarca = (codMarca: number) => {
    setSelectedMarcas(prev => prev.filter(m => m.CODIGO !== codMarca))
  }

  const removeGrupo = (codGrupo: number) => {
    setSelectedGrupos(prev => prev.filter(g => g.CODGRUPOPROD !== codGrupo))
  }

  const loadAccess = async () => {
    if (!user) return
    setIsLoading(true)

    try {
      const response = await fetch(`/api/usuarios/acessos?codUsuario=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.CODUSUARIO) {
          setAccess({
            acessoClientes: data.ACESSO_CLIENTES || 'VINCULADO',
            acessoProdutos: data.ACESSO_PRODUTOS || 'TODOS',
            acessoTarefas: data.ACESSO_TAREFAS || 'VINCULADO',
            acessoAdministracao: data.ACESSO_ADMINISTRACAO === 'S',
            acessoUsuarios: data.ACESSO_USUARIOS === 'S',
            telaPedidosVendas: data.TELA_PEDIDOS_VENDAS !== 'N',
            telaRotas: data.TELA_ROTAS !== 'N',
            telaTarefas: data.TELA_TAREFAS !== 'N',
            telaNegocios: data.TELA_NEGOCIOS !== 'N',
            telaClientes: data.TELA_CLIENTES !== 'N',
            telaProdutos: data.TELA_PRODUTOS !== 'N',
            telaPoliticas: data.TELA_TABELA_PRECOS !== 'N',
            telaUsuarios: data.TELA_USUARIOS === 'S',
            telaAdministracao: data.TELA_ADMINISTRACAO === 'S',
            telaDashboard: data.TELA_DASHBOARD !== 'N',
          })
        }
      }
    } catch (error) {
      console.error("Erro ao carregar acessos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadVendedorNome = async () => {
    if (!user?.codVendedor) {
      setVendedorNome("")
      return
    }

    try {
      const { OfflineDataService } = await import('@/lib/offline-data-service')
      const vendedores = await OfflineDataService.getVendedores()
      const vendedor = vendedores.find((v: any) => parseInt(v.CODVEND) === user.codVendedor)
      if (vendedor) {
        setVendedorNome(vendedor.APELIDO)
      }
    } catch (error) {
      console.error("Erro ao carregar vendedor:", error)
    }
  }

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)

    try {
      const response = await fetch('/api/usuarios/acessos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codUsuario: user.id,
          ...access
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar acessos')
      }

      if (access.acessoClientes === 'MANUAL') {
        const clientesResponse = await fetch('/api/usuarios/acessos/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codUsuario: user.id,
            clientes: selectedClientes.map(c => c.CODPARC)
          })
        })
        if (!clientesResponse.ok) {
          throw new Error('Erro ao salvar clientes manuais')
        }
      }

      if (access.acessoProdutos === 'MANUAL') {
        const produtosResponse = await fetch('/api/usuarios/acessos/produtos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codUsuario: user.id,
            produtos: selectedProdutos.map(p => p.CODPROD)
          })
        })
        if (!produtosResponse.ok) {
          throw new Error('Erro ao salvar produtos manuais')
        }
      }

      if (access.acessoProdutos === 'MARCA') {
        const marcasResponse = await fetch('/api/usuarios/acessos/marcas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codUsuario: user.id,
            marcas: selectedMarcas.map(m => m.CODIGO)
          })
        })
        if (!marcasResponse.ok) {
          throw new Error('Erro ao salvar marcas permitidas')
        }
      }

      if (access.acessoProdutos === 'GRUPO') {
        const gruposResponse = await fetch('/api/usuarios/acessos/grupos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codUsuario: user.id,
            grupos: selectedGrupos.map(g => g.CODGRUPOPROD)
          })
        })
        if (!gruposResponse.ok) {
          throw new Error('Erro ao salvar grupos permitidos')
        }
      }

      toast.success('Acessos salvos com sucesso!')
      onClose()
    } catch (error: any) {
      console.error("Erro ao salvar acessos:", error)
      toast.error(error.message || 'Erro ao salvar acessos')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !user) return null

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Administrador':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
      case 'Gerente':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      case 'Vendedor':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {(isLoading || isSaving) && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">
              {isLoading ? "Carregando acessos..." : "Salvando..."}
            </p>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isSaving ? onClose : undefined} />

      <div className="relative bg-card rounded-lg shadow-lg w-full max-w-4xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden m-4">
        <div className="flex items-center justify-between p-4 md:p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-foreground">Gerenciamento de Acessos</h2>
              <p className="text-sm text-muted-foreground">Configure as permissões do usuário</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <Card className="mx-4 md:mx-6 mt-4 flex-shrink-0">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{user.name}</h3>
                    <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-col md:items-end text-sm">
                <span className="text-muted-foreground">ID: {user.id}</span>
                {user.codVendedor && vendedorNome && (
                  <span className="text-muted-foreground">
                    {user.role === 'Gerente' ? 'Gerente' : 'Vendedor'}: {vendedorNome}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <ScrollArea className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Tabs defaultValue="telas" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
              <TabsTrigger value="telas" className="text-xs md:text-sm">
                <Eye className="w-4 h-4 mr-1 md:mr-2" />
                Telas
              </TabsTrigger>
              <TabsTrigger value="clientes" className="text-xs md:text-sm">
                <Users className="w-4 h-4 mr-1 md:mr-2" />
                Clientes
              </TabsTrigger>
              <TabsTrigger value="produtos" className="text-xs md:text-sm">
                <Package className="w-4 h-4 mr-1 md:mr-2" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="outros" className="text-xs md:text-sm">
                <Settings className="w-4 h-4 mr-1 md:mr-2" />
                Outros
              </TabsTrigger>
            </TabsList>

            <TabsContent value="telas" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Acesso às Telas
                  </CardTitle>
                  <CardDescription>
                    Defina quais telas o usuário pode acessar no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <LineChart className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="tela-dashboard">Dashboard (Início)</Label>
                      </div>
                      <Switch
                        id="tela-dashboard"
                        checked={access.telaDashboard}
                        onCheckedChange={(checked) => setAccess({ ...access, telaDashboard: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="tela-pedidos">Pedidos de Vendas</Label>
                      </div>
                      <Switch
                        id="tela-pedidos"
                        checked={access.telaPedidosVendas}
                        onCheckedChange={(checked) => setAccess({ ...access, telaPedidosVendas: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="tela-rotas">Rotas</Label>
                      </div>
                      <Switch
                        id="tela-rotas"
                        checked={access.telaRotas}
                        onCheckedChange={(checked) => setAccess({ ...access, telaRotas: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="tela-tarefas">Tarefas</Label>
                      </div>
                      <Switch
                        id="tela-tarefas"
                        checked={access.telaTarefas}
                        onCheckedChange={(checked) => setAccess({ ...access, telaTarefas: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="tela-negocios">Negócios</Label>
                      </div>
                      <Switch
                        id="tela-negocios"
                        checked={access.telaNegocios}
                        onCheckedChange={(checked) => setAccess({ ...access, telaNegocios: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="tela-clientes">Clientes</Label>
                      </div>
                      <Switch
                        id="tela-clientes"
                        checked={access.telaClientes}
                        onCheckedChange={(checked) => setAccess({ ...access, telaClientes: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="tela-produtos">Produtos</Label>
                      </div>
                      <Switch
                        id="tela-produtos"
                        checked={access.telaProdutos}
                        onCheckedChange={(checked) => setAccess({ ...access, telaProdutos: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="tela-precos">Políticas Com. e Campanhas</Label>
                      </div>
                      <Switch
                        id="tela-precos"
                        checked={access.telaPoliticas}
                        onCheckedChange={(checked) => setAccess({ ...access, telaPoliticas: checked })}
                      />
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Acesso Administrativo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-orange-600" />
                          <Label htmlFor="tela-usuarios" className="text-orange-700 dark:text-orange-400">Usuários</Label>
                        </div>
                        <Switch
                          id="tela-usuarios"
                          checked={access.telaUsuarios}
                          onCheckedChange={(checked) => setAccess({ ...access, telaUsuarios: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-red-600" />
                          <Label htmlFor="tela-admin" className="text-red-700 dark:text-red-400">Administração</Label>
                        </div>
                        <Switch
                          id="tela-admin"
                          checked={access.telaAdministracao}
                          onCheckedChange={(checked) => setAccess({ ...access, telaAdministracao: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clientes" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Regra de Acesso a Clientes
                  </CardTitle>
                  <CardDescription>
                    Define quais clientes o usuário pode visualizar e interagir.
                    Esta regra é aplicada em: Dashboard, Pedidos de Venda, Rotas, Visitas e IA.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={access.acessoClientes}
                    onValueChange={(value) => setAccess({ ...access, acessoClientes: value as any })}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="VINCULADO" id="cli-vinculado" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="cli-vinculado" className="font-medium cursor-pointer">
                          Somente Clientes Vinculados ao Usuário
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          O usuário verá apenas os clientes diretamente vinculados a ele
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="EQUIPE" id="cli-equipe" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="cli-equipe" className="font-medium cursor-pointer">
                          Somente Clientes Vinculados à Equipe
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          O usuário verá clientes de toda a sua equipe (gerente + vendedores)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="MANUAL" id="cli-manual" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="cli-manual" className="font-medium cursor-pointer">
                          Selecionar Clientes Manualmente
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Defina manualmente quais clientes o usuário pode acessar
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="TODOS" id="cli-todos" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="cli-todos" className="font-medium cursor-pointer">
                          Todos os Clientes
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          O usuário terá acesso a todos os clientes do sistema
                        </p>
                      </div>
                    </div>
                  </RadioGroup>

                  {access.acessoClientes === 'MANUAL' && (
                    <div className="mt-4 space-y-3">
                      <Separator />
                      <div className="space-y-2">
                        <Label>Buscar e Adicionar Clientes</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={searchClientes}
                            onChange={(e) => setSearchClientes(e.target.value)}
                            placeholder="Digite o nome ou CNPJ do cliente..."
                            className="pl-10"
                          />
                          {isSearchingClientes && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>

                        {clientesList.length > 0 && (
                          <div className="border rounded-lg max-h-[150px] overflow-y-auto">
                            {clientesList.map(cliente => {
                              const isSelected = selectedClientes.some(c => c.CODPARC === cliente.CODPARC)
                              return (
                                <div
                                  key={cliente.CODPARC}
                                  className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                                  onClick={() => toggleCliente(cliente)}
                                >
                                  <Checkbox checked={isSelected} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{cliente.NOMEPARC}</p>
                                    <p className="text-xs text-muted-foreground">{cliente.CGC_CPF || 'Sem documento'}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {selectedClientes.length > 0 && (
                        <div className="space-y-2">
                          <Label>Clientes Selecionados ({selectedClientes.length})</Label>
                          <div className="border rounded-lg max-h-[150px] overflow-y-auto">
                            {selectedClientes.map(cliente => (
                              <div
                                key={cliente.CODPARC}
                                className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50 border-b last:border-b-0"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{cliente.NOMEPARC}</p>
                                  <p className="text-xs text-muted-foreground">Cód: {cliente.CODPARC}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => removeCliente(cliente.CODPARC)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Onde esta regra é aplicada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <LineChart className="w-4 h-4" />
                      <span>Dashboard de Vendas (KPIs Gerais)</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ClipboardList className="w-4 h-4" />
                      <span>Pedidos de Vendas (listagem e criação)</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>Rotas (criação e visualização)</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      <span>Visitas (visualização)</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Bot className="w-4 h-4" />
                      <span>IA Análise e IA Assistente</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="produtos" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Regra de Acesso a Produtos
                  </CardTitle>
                  <CardDescription>
                    Define quais produtos o usuário pode visualizar e vender.
                    Esta regra é aplicada no catálogo de produtos em Pedidos de Venda, Dashboard e IA.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={access.acessoProdutos}
                    onValueChange={(value) => setAccess({ ...access, acessoProdutos: value as any })}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="TODOS" id="prod-todos" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="prod-todos" className="font-medium cursor-pointer">
                          Todos os Produtos
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          O usuário terá acesso a todos os produtos do catálogo
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="MARCA" id="prod-marca" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="prod-marca" className="font-medium cursor-pointer">
                          Produtos por Marca
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          O usuário verá apenas produtos de marcas específicas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="GRUPO" id="prod-grupo" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="prod-grupo" className="font-medium cursor-pointer">
                          Produtos por Grupo
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          O usuário verá apenas produtos de grupos específicos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="MANUAL" id="prod-manual" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="prod-manual" className="font-medium cursor-pointer">
                          Selecionar Produtos Manualmente
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Defina manualmente quais produtos o usuário pode acessar
                        </p>
                      </div>
                    </div>
                  </RadioGroup>

                  {access.acessoProdutos === 'MARCA' && (
                    <div className="mt-4 space-y-3">
                      <Separator />
                      <div className="space-y-2">
                        <Label>Buscar e Adicionar Marcas</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={searchMarcas}
                            onChange={(e) => setSearchMarcas(e.target.value)}
                            placeholder="Digite o nome da marca..."
                            className="pl-10"
                          />
                          {isSearchingMarcas && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>

                        {marcasList.length > 0 && (
                          <div className="border rounded-lg max-h-[150px] overflow-y-auto">
                            {marcasList.map(marca => {
                              const isSelected = selectedMarcas.some(m => m.CODIGO === marca.CODIGO)
                              return (
                                <div
                                  key={marca.CODIGO}
                                  className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                                  onClick={() => toggleMarca(marca)}
                                >
                                  <Checkbox checked={isSelected} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{marca.DESCRICAO}</p>
                                    <p className="text-xs text-muted-foreground">Cód: {marca.CODIGO}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {selectedMarcas.length > 0 && (
                        <div className="space-y-2">
                          <Label>Marcas Selecionadas ({selectedMarcas.length})</Label>
                          <div className="border rounded-lg max-h-[150px] overflow-y-auto">
                            {selectedMarcas.map(marca => (
                              <div
                                key={marca.CODIGO}
                                className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50 border-b last:border-b-0"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{marca.DESCRICAO}</p>
                                  <p className="text-xs text-muted-foreground">Cód: {marca.CODIGO}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => removeMarca(marca.CODIGO)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {access.acessoProdutos === 'GRUPO' && (
                    <div className="mt-4 space-y-3">
                      <Separator />
                      <div className="space-y-2">
                        <Label>Buscar e Adicionar Grupos</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={searchGrupos}
                            onChange={(e) => setSearchGrupos(e.target.value)}
                            placeholder="Digite o nome do grupo..."
                            className="pl-10"
                          />
                          {isSearchingGrupos && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>

                        {gruposList.length > 0 && (
                          <div className="border rounded-lg max-h-[150px] overflow-y-auto">
                            {gruposList.map(grupo => {
                              const isSelected = selectedGrupos.some(g => g.CODGRUPOPROD === grupo.CODGRUPOPROD)
                              return (
                                <div
                                  key={grupo.CODGRUPOPROD}
                                  className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                                  onClick={() => toggleGrupo(grupo)}
                                >
                                  <Checkbox checked={isSelected} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{grupo.DESCRGRUPOPROD}</p>
                                    <p className="text-xs text-muted-foreground">Cód: {grupo.CODGRUPOPROD}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {selectedGrupos.length > 0 && (
                        <div className="space-y-2">
                          <Label>Grupos Selecionados ({selectedGrupos.length})</Label>
                          <div className="border rounded-lg max-h-[150px] overflow-y-auto">
                            {selectedGrupos.map(grupo => (
                              <div
                                key={grupo.CODGRUPOPROD}
                                className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50 border-b last:border-b-0"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{grupo.DESCRGRUPOPROD}</p>
                                  <p className="text-xs text-muted-foreground">Cód: {grupo.CODGRUPOPROD}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => removeGrupo(grupo.CODGRUPOPROD)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {access.acessoProdutos === 'MANUAL' && (
                    <div className="mt-4 space-y-3">
                      <Separator />
                      <div className="space-y-2">
                        <Label>Buscar e Adicionar Produtos</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={searchProdutos}
                            onChange={(e) => setSearchProdutos(e.target.value)}
                            placeholder="Digite o nome ou código do produto..."
                            className="pl-10"
                          />
                          {isSearchingProdutos && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>

                        {produtosList.length > 0 && (
                          <div className="border rounded-lg max-h-[150px] overflow-y-auto">
                            {produtosList.map(produto => {
                              const isSelected = selectedProdutos.some(p => p.CODPROD === produto.CODPROD)
                              return (
                                <div
                                  key={produto.CODPROD}
                                  className="flex items-center gap-3 p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                                  onClick={() => toggleProduto(produto)}
                                >
                                  <Checkbox checked={isSelected} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{produto.DESCRPROD}</p>
                                    <p className="text-xs text-muted-foreground">Cód: {produto.CODPROD} | {produto.CODVOL || 'UN'}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {selectedProdutos.length > 0 && (
                        <div className="space-y-2">
                          <Label>Produtos Selecionados ({selectedProdutos.length})</Label>
                          <div className="border rounded-lg max-h-[150px] overflow-y-auto">
                            {selectedProdutos.map(produto => (
                              <div
                                key={produto.CODPROD}
                                className="flex items-center justify-between gap-2 p-2 hover:bg-muted/50 border-b last:border-b-0"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{produto.DESCRPROD}</p>
                                  <p className="text-xs text-muted-foreground">Cód: {produto.CODPROD}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => removeProduto(produto.CODPROD)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="outros" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-primary" />
                    Regra de Acesso a Tarefas
                  </CardTitle>
                  <CardDescription>
                    Define quais tarefas o usuário pode visualizar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={access.acessoTarefas}
                    onValueChange={(value) => setAccess({ ...access, acessoTarefas: value as any })}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="VINCULADO" id="tar-vinculado" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="tar-vinculado" className="font-medium cursor-pointer">
                          Somente Tarefas Vinculadas ao Usuário
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          O usuário verá apenas as tarefas atribuídas a ele
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="EQUIPE" id="tar-equipe" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="tar-equipe" className="font-medium cursor-pointer">
                          Somente Tarefas Vinculadas à Equipe
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          O usuário verá tarefas de toda a sua equipe
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="TODOS" id="tar-todos" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="tar-todos" className="font-medium cursor-pointer">
                          Todas as Tarefas
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          O usuário terá acesso a todas as tarefas do sistema
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Administração
                  </CardTitle>
                  <CardDescription>
                    Permissões administrativas do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <Label htmlFor="acesso-admin" className="font-medium">Acesso à Administração</Label>
                      <p className="text-sm text-muted-foreground">
                        Permite acessar configurações do sistema
                      </p>
                    </div>
                    <Switch
                      id="acesso-admin"
                      checked={access.acessoAdministracao}
                      onCheckedChange={(checked) => setAccess({ ...access, acessoAdministracao: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <Label htmlFor="acesso-usuarios" className="font-medium">Acesso a Usuários</Label>
                      <p className="text-sm text-muted-foreground">
                        Permite gerenciar usuários do sistema
                      </p>
                    </div>
                    <Switch
                      id="acesso-usuarios"
                      checked={access.acessoUsuarios}
                      onCheckedChange={(checked) => setAccess({ ...access, acessoUsuarios: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    IA Análise e IA Assistente
                  </CardTitle>
                  <CardDescription>
                    As regras de acesso da IA seguem automaticamente as configurações definidas acima
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Notas e Itens: Segue regra de acesso a Clientes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>Produtos: Segue regra de acesso a Produtos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Parceiros: Segue regra de acesso a Clientes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4" />
                      <span>Tarefas: Segue regra de acesso a Tarefas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>Rotas e Visitas: Segue regra de acesso a Clientes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t flex-shrink-0 bg-card">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  WifiOff,
  RefreshCw,
  Eye
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClienteDetalhesModal } from "@/components/cliente-detalhes-modal"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/lib/auth-service"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { OfflineDataService } from '@/lib/offline-data-service'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Partner {
  _id: string
  CODPARC: string
  NOMEPARC: string
  CGC_CPF: string
  CODCID?: string
  ATIVO?: string
  TIPPESSOA?: string
  CODVEND?: number
  CLIENTE?: string
}

const ITEMS_PER_PAGE = 50

export default function PartnersTable() {
  const [searchName, setSearchName] = useState("")
  const [searchCode, setSearchCode] = useState("")
  const [appliedSearchName, setAppliedSearchName] = useState("")
  const [appliedSearchCode, setAppliedSearchCode] = useState("")
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [partners, setPartners] = useState<Partner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [vendedoresMap, setVendedoresMap] = useState<Record<number, string>>({})
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const loadingRef = useRef(false);
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: "Modo Offline",
        description: "Você está sem conexão. Os dados exibidos são do cache.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  useEffect(() => {
    loadPartners();
  }, [currentPage, appliedSearchName, appliedSearchCode, isOffline]);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) setCurrentUser(user);
    loadVendedores();
  }, []);

  const loadVendedores = async () => {
    try {
      const response = await fetch('/api/vendedores?tipo=todos');
      const vendedores = await response.json();
      const map: Record<number, string> = {};
      vendedores.forEach((v: any) => { map[v.CODVEND] = v.APELIDO; });
      setVendedoresMap(map);
    } catch (error) { console.error(error); }
  };

  const handleSearch = () => {
    setAppliedSearchName(searchName);
    setAppliedSearchCode(searchCode);
    setCurrentPage(1);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const loadPartners = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setIsLoading(true);
      let allParceiros: Partner[] = await OfflineDataService.getParceiros();

      let filteredParceiros = allParceiros;
      if (appliedSearchName.trim() || appliedSearchCode.trim()) {
        filteredParceiros = allParceiros.filter(p => {
          const matchName = !appliedSearchName || p.NOMEPARC?.toLowerCase().includes(appliedSearchName.toLowerCase());
          const matchCode = !appliedSearchCode || p.CODPARC?.toString().includes(appliedSearchCode);
          return matchName && matchCode;
        });
      }

      const total = filteredParceiros.length;
      const totalPgs = Math.ceil(total / ITEMS_PER_PAGE) || 1;
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const paginatedParceiros = filteredParceiros.slice(start, start + ITEMS_PER_PAGE);

      setPartners(paginatedParceiros);
      setTotalPages(totalPgs);
      setTotalRecords(total);
    } catch (error: any) {
      toast({ title: "Erro", description: "Falha ao carregar clientes.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  const handleVerDetalhes = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsDetalhesModalOpen(true);
  };

  const getInitials = (name: string) => {
    const words = name.trim().split(' ');
    if (words.length === 0) return '??';
    return (words[0][0] + (words[words.length - 1]?.[0] || '')).toUpperCase();
  };

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden scrollbar-hide">
      {/* Header - Desktop */}
      <div className="hidden md:block px-4 md:px-6 py-4 bg-transparent">
        <h1 className="text-3xl font-bold tracking-tight text-[#1E5128]">Clientes</h1>
        <p className="text-[#1E5128]/70 mt-1">
          Consulta e gerenciamento de clientes e parceiros
        </p>
      </div>

      {/* Header - Mobile */}
      <div className="md:hidden px-4 py-4 bg-transparent border-b border-black/5">
        <h1 className="text-xl font-bold text-[#1E5128]">Clientes</h1>
        <p className="text-sm text-[#1E5128]/70 mt-1">
          Consulta e gerenciamento de parceiros
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Filtros Desktop */}
        <div className="hidden md:block px-4 md:px-6 py-2">
          <Card className="rounded-2xl border-[#F2F2F2] shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#F2F2F2] bg-slate-50/50 py-3">
              <CardTitle className="text-sm font-bold text-[#1E5128]">Filtros de Busca</CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-white grid md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5 md:col-span-1">
                <Label className="text-xs font-bold text-slate-500 uppercase">Código</Label>
                <Input className="h-10 border-[#F2F2F2] bg-slate-50/50 focus-visible:ring-[#76BA1B]" placeholder="Ex: 1234..." value={searchCode} onChange={e => setSearchCode(e.target.value)} onKeyPress={handleSearchKeyPress} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Nome ou Razão Social</Label>
                <Input className="h-10 border-[#F2F2F2] bg-slate-50/50 focus-visible:ring-[#76BA1B]" placeholder="Buscar por nome..." value={searchName} onChange={e => setSearchName(e.target.value)} onKeyPress={handleSearchKeyPress} />
              </div>
              <div className="md:col-span-1">
                <Button onClick={handleSearch} className="w-full h-10 bg-[#76BA1B] hover:bg-[#1E5128] text-white font-bold rounded-xl shadow-md transition-all">
                  <Search className="w-4 h-4 mr-2" /> BUscar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros Mobile */}
        <div className="md:hidden">
          <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#F2F2F2]">
              <span className="text-sm font-bold text-[#1E5128]">Filtros de Busca</span>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-50">
                  {filtrosAbertos ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="border-b border-[#F2F2F2] bg-slate-50/50">
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="searchCodeMobile" className="text-xs font-bold text-slate-500 uppercase">
                    Código
                  </Label>
                  <div className="relative">
                    <Input
                      id="searchCodeMobile"
                      type="text"
                      placeholder="Buscar por código"
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="h-10 pr-9 text-sm bg-white border-[#F2F2F2] rounded-xl"
                    />
                    {searchCode && (
                      <button
                        onClick={() => setSearchCode("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="searchNameMobile" className="text-xs font-bold text-slate-500 uppercase">
                    Nome
                  </Label>
                  <div className="relative">
                    <Input
                      id="searchNameMobile"
                      type="text"
                      placeholder="Buscar por nome"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="h-10 pr-9 text-sm bg-white border-[#F2F2F2] rounded-xl"
                    />
                    {searchName && (
                      <button
                        onClick={() => setSearchName("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchName("")
                      setSearchCode("")
                      setAppliedSearchName("")
                      setAppliedSearchCode("")
                      setCurrentPage(1)
                      setFiltrosAbertos(false)
                    }}
                    className="flex-1 h-10 text-sm font-bold border-[#F2F2F2] rounded-xl hover:bg-slate-50"
                  >
                    Limpar
                  </Button>
                  <Button
                    onClick={() => {
                      handleSearch()
                      setFiltrosAbertos(false)
                    }}
                    disabled={isLoading}
                    className="flex-[2] h-10 text-sm font-bold bg-[#76BA1B] hover:bg-[#1E5128] text-white rounded-xl shadow-md transition-all"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {isLoading ? 'Buscando...' : 'Aplicar Filtros'}
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {(appliedSearchName || appliedSearchCode) && (
          <div className="md:hidden flex items-center gap-2 p-2 bg-[#76BA1B]/5 border-b border-[#F2F2F2] overflow-x-auto whitespace-nowrap scrollbar-hide">
            <span className="text-[10px] font-bold text-[#1E5128] uppercase ml-2">Filtros:</span>
            {appliedSearchCode && (
              <Badge variant="secondary" className="bg-white text-[#1E5128] border-[#76BA1B]/20 shadow-sm text-[10px] py-0 px-2 flex items-center gap-1 rounded-full">
                Cód: {appliedSearchCode}
                <X
                  className="w-3 h-3 cursor-pointer text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    setSearchCode("")
                    setAppliedSearchCode("")
                    setCurrentPage(1)
                  }}
                />
              </Badge>
            )}
            {appliedSearchName && (
              <Badge variant="secondary" className="bg-white text-[#1E5128] border-[#76BA1B]/20 shadow-sm text-[10px] py-0 px-2 flex items-center gap-1 rounded-full">
                Nome: {appliedSearchName}
                <X
                  className="w-3 h-3 cursor-pointer text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    setSearchName("")
                    setAppliedSearchName("")
                    setCurrentPage(1)
                  }}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Lista / Tabela */}
        <div className="h-[calc(100%-140px)] overflow-auto px-4 md:px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center py-20 gap-2">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : partners.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-4 text-center px-6">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Nenhum parceiro encontrado</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  {isOffline
                    ? "Você está offline e o cache local está vazio. É necessária uma primeira carga com internet para acessar os dados."
                    : "Não foi possível encontrar nenhum parceiro no sistema."}
                </p>
              </div>
              {isOffline && (
                <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Recarregar
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Tabela Desktop */}
              <div className="hidden md:block overflow-hidden bg-white rounded-2xl border border-[#F2F2F2] shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-32 font-bold py-4">Código</TableHead>
                      <TableHead className="font-bold py-4">Nome / Razão Social</TableHead>
                      <TableHead className="font-bold py-4">CPF / CNPJ</TableHead>
                      <TableHead className="w-32 text-center font-bold py-4">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map(p => (
                      <TableRow key={p.CODPARC} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => handleVerDetalhes(p)}>
                        <TableCell className="font-mono text-xs text-gray-500">{p.CODPARC}</TableCell>
                        <TableCell className="text-slate-500">{p.NOMEPARC}</TableCell>
                        <TableCell className="text-slate-500">{p.CGC_CPF || '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleVerDetalhes(p); }} className="h-8 w-8 p-0" title="Visualizar">
                              <Eye className="w-4 h-4 text-gray-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Cards Mobile */}
              <div className="md:hidden space-y-3">
                {partners.map(p => (
                  <div key={p.CODPARC} onClick={() => handleVerDetalhes(p)} className="p-4 bg-white border border-[#F2F2F2] rounded-2xl flex items-center gap-3 active:bg-slate-50 transition-colors shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#76BA1B] to-[#1E5128] flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {getInitials(p.NOMEPARC)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[#1E5128] truncate">{p.NOMEPARC}</p>
                      <p className="text-xs text-slate-500 font-medium">{p.CGC_CPF || 'Sem documento'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Paginação */}
      <div className="p-4 border-t border-[#F2F2F2] bg-white flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="rounded-xl border-[#F2F2F2] font-bold">
          <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
        </Button>
        <span className="text-xs text-slate-500 font-medium">Pág. {currentPage} de {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="rounded-xl border-[#F2F2F2] font-bold">
          Próxima <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <ClienteDetalhesModal
        isOpen={isDetalhesModalOpen}
        onClose={() => setIsDetalhesModalOpen(false)}
        cliente={selectedPartner}
      />
    </div>
  );
}